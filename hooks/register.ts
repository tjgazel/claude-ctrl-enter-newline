import type { EngineInterface, Register } from 'claude-code'

const KEY = 'ctrl+enter'
const ACTION = 'chat:newline'
const COMMAND = 'ctrl-enter'
const SCHEMA = 'https://www.schemastore.org/claude-code-keybindings.json'
const DOCS = 'https://code.claude.com/docs/en/keybindings'

// English by default; Portuguese when the `language` setting asks for it
export type Lang = 'en' | 'pt'

const TEXT = {
  en: {
    added: (path: string) => `Ctrl+Enter now inserts a newline (added to ${path}).`,
    conflict: 'Ctrl+Enter already has another action in your keybindings.json, so it was left alone.',
    invalid: 'Your keybindings.json is not valid JSON, so it was left alone. Fix it and run /ctrl-enter on.',
    failed: (why: string) => `Could not update keybindings.json: ${why}`,
    noDir: 'Could not find the Claude Code config folder (set CLAUDE_CONFIG_DIR, HOME or USERPROFILE).',
    on: 'on: Ctrl+Enter inserts a newline.',
    ownOn: 'It was added by this mod; /ctrl-enter off removes it.',
    userOn: 'It was already in your file, so /ctrl-enter off will not remove it.',
    off: 'off: Ctrl+Enter keeps its default action (send now).',
    other: 'other: Ctrl+Enter is bound to another action in your file.',
    removed: 'Removed the Ctrl+Enter binding. Ctrl+Enter is back to its default.',
    kept: 'The Ctrl+Enter binding was not added by this mod, so it was kept.',
    disabled: 'Disabled: the mod will not touch keybindings.json. Run /ctrl-enter on to enable it again.',
    hint:
      'If Ctrl+Enter still sends your message, your terminal does not report it apart from Enter (it needs the Kitty keyboard protocol). Ctrl+J inserts a newline in any terminal.',
    file: (path: string) => `File: ${path}`,
  },
  pt: {
    added: (path: string) => `Ctrl+Enter agora quebra a linha (adicionado em ${path}).`,
    conflict: 'O Ctrl+Enter já tem outra ação no seu keybindings.json, então não mexi.',
    invalid: 'O seu keybindings.json não é um JSON válido, então não mexi. Corrija e rode /ctrl-enter on.',
    failed: (why: string) => `Não consegui atualizar o keybindings.json: ${why}`,
    noDir: 'Não encontrei a pasta de configuração do Claude Code (defina CLAUDE_CONFIG_DIR, HOME ou USERPROFILE).',
    on: 'ligado: Ctrl+Enter quebra a linha.',
    ownOn: 'Foi adicionado por este mod; /ctrl-enter off remove.',
    userOn: 'Já estava no seu arquivo, então /ctrl-enter off não vai remover.',
    off: 'desligado: Ctrl+Enter mantém a ação padrão (enviar agora).',
    other: 'outro: o Ctrl+Enter está ligado a outra ação no seu arquivo.',
    removed: 'Removi o atalho do Ctrl+Enter. Ele voltou ao padrão.',
    kept: 'O atalho do Ctrl+Enter não foi adicionado por este mod, então mantive.',
    disabled: 'Desativado: o mod não vai mexer no keybindings.json. Rode /ctrl-enter on para ativar de novo.',
    hint:
      'Se o Ctrl+Enter ainda enviar a mensagem, o seu terminal não o distingue do Enter (precisa do protocolo de teclado Kitty). O Ctrl+J quebra a linha em qualquer terminal.',
    file: (path: string) => `Arquivo: ${path}`,
  },
} as const

type Block = { context?: unknown; bindings?: unknown }
type Doc = Record<string, unknown> & { bindings: unknown[] }

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const parse = (text: string): Doc | undefined => {
  try {
    const value: unknown = JSON.parse(text)
    return isRecord(value) && Array.isArray(value.bindings) ? (value as Doc) : undefined
  } catch {
    return undefined
  }
}

const dump = (doc: unknown) => `${JSON.stringify(doc, null, 2)}\n`

// Claude Code reads key names case-insensitively and accepts aliases
export const isCtrlEnter = (key: string) => {
  const parts = key
    .toLowerCase()
    .split('+')
    .map(p => p.trim())
    .map(p => (p === 'control' ? 'ctrl' : p === 'return' ? 'enter' : p))
  return parts.length === 2 && parts.includes('ctrl') && parts.includes('enter')
}

const chatBlocks = (doc: Doc) =>
  doc.bindings.filter(
    (b): b is Block & { bindings: Record<string, unknown> } =>
      isRecord(b) && b.context === 'Chat' && isRecord(b.bindings),
  )

// the key the file already binds (any spelling), with the action it points to
const existing = (doc: Doc) => {
  for (const block of chatBlocks(doc)) {
    for (const [key, action] of Object.entries(block.bindings)) {
      if (isCtrlEnter(key)) return { block, key, action }
    }
  }
  return undefined
}

export const fresh = () =>
  dump({
    $schema: SCHEMA,
    $docs: DOCS,
    bindings: [{ context: 'Chat', bindings: { [KEY]: ACTION } }],
  })

export type Added = { text: string; result: 'added' | 'already' | 'conflict' | 'invalid' }

// merges the binding into the file's text without touching anything else
export const addBinding = (text: string | undefined): Added => {
  if (text === undefined || text.trim() === '') return { text: fresh(), result: 'added' }
  const doc = parse(text)
  if (doc === undefined) return { text, result: 'invalid' }

  const found = existing(doc)
  if (found !== undefined) {
    return { text, result: found.action === ACTION ? 'already' : 'conflict' }
  }

  const block = chatBlocks(doc)[0]
  if (block === undefined) doc.bindings.push({ context: 'Chat', bindings: { [KEY]: ACTION } })
  else block.bindings[KEY] = ACTION

  return { text: dump(doc), result: 'added' }
}

export type Removed = { text: string; result: 'removed' | 'absent' | 'conflict' | 'invalid' }

// takes out the binding, but only when it points to chat:newline
export const removeBinding = (text: string | undefined): Removed => {
  if (text === undefined || text.trim() === '') return { text: text ?? '', result: 'absent' }
  const doc = parse(text)
  if (doc === undefined) return { text, result: 'invalid' }

  const found = existing(doc)
  if (found === undefined) return { text, result: 'absent' }
  if (found.action !== ACTION) return { text, result: 'conflict' }

  delete found.block.bindings[found.key]
  if (Object.keys(found.block.bindings).length === 0) {
    doc.bindings = doc.bindings.filter(b => b !== found.block)
  }

  return { text: dump(doc), result: 'removed' }
}

export type State = 'on' | 'other' | 'off' | 'invalid'

export const stateOf = (text: string | undefined): State => {
  if (text === undefined || text.trim() === '') return 'off'
  const doc = parse(text)
  if (doc === undefined) return 'invalid'
  const found = existing(doc)
  return found === undefined ? 'off' : found.action === ACTION ? 'on' : 'other'
}

// whether a `language` setting (`portuguese`, `Português`, `pt-BR`) asks for Portuguese
export const langOf = (language: unknown): Lang =>
  typeof language === 'string' && /^(pt|port)/i.test(language.trim()) ? 'pt' : 'en'

async function readLang($: EngineInterface): Promise<Lang> {
  try {
    return langOf((await $.settings.read()).language)
  } catch {
    return 'en'
  }
}

// USERPROFILE before HOME: Git Bash sets HOME to /c/Users/..., which Node cannot open
async function keybindingsPath($: EngineInterface): Promise<string | undefined> {
  const custom = await $.env.get('CLAUDE_CONFIG_DIR')
  if (custom !== undefined && custom !== '') return `${custom.replace(/[\\/]+$/, '')}/keybindings.json`
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME'))
  return home === undefined || home === '' ? undefined : `${home.replace(/[\\/]+$/, '')}/.claude/keybindings.json`
}

async function readFile($: EngineInterface, path: string): Promise<string | undefined> {
  return (await $.fs.exists(path)) ? await $.fs.read(path) : undefined
}

// keeps the first version of a file this mod changes, once
async function backup($: EngineInterface, path: string, text: string | undefined) {
  const copy = `${path}.ctrl-enter-newline.bak`
  if (text !== undefined && text.trim() !== '' && !(await $.fs.exists(copy))) {
    await $.fs.write(copy, text)
  }
}

type Outcome = { message: string; path?: string }

async function enable($: EngineInterface, lang: Lang): Promise<Outcome> {
  const t = TEXT[lang]
  const path = await keybindingsPath($)
  if (path === undefined) return { message: t.noDir }

  try {
    const text = await readFile($, path)
    const change = addBinding(text)
    if (change.result === 'added') {
      await backup($, path, text)
      await $.fs.write(path, change.text)
      await $.store.set('owned', true)
      return { message: t.added(path), path }
    }
    if (change.result === 'conflict') return { message: t.conflict, path }
    if (change.result === 'invalid') return { message: t.invalid, path }
    return { message: t.on, path }
  } catch (err) {
    return { message: t.failed(String(err)), path }
  }
}

async function disable($: EngineInterface, lang: Lang): Promise<Outcome> {
  const t = TEXT[lang]
  const path = await keybindingsPath($)
  if (path === undefined) return { message: t.noDir }
  if ((await $.store.get('owned')) !== true) return { message: t.kept, path }

  try {
    const text = await readFile($, path)
    const change = removeBinding(text)
    if (change.result === 'removed') {
      await $.fs.write(path, change.text)
      await $.store.delete('owned')
      return { message: t.removed, path }
    }
    if (change.result === 'conflict') return { message: t.conflict, path }
    if (change.result === 'invalid') return { message: t.invalid, path }
    await $.store.delete('owned')
    return { message: t.off, path }
  } catch (err) {
    return { message: t.failed(String(err)), path }
  }
}

async function status($: EngineInterface, lang: Lang): Promise<string> {
  const t = TEXT[lang]
  const path = await keybindingsPath($)
  if (path === undefined) return t.noDir
  const state = stateOf(await readFile($, path).catch(() => undefined))
  const owned = (await $.store.get('owned')) === true
  const disabled = (await $.store.get('disabled')) === true
  const lines = [
    state === 'on' ? t.on : state === 'other' ? t.other : state === 'invalid' ? t.invalid : t.off,
    ...(state === 'on' ? [owned ? t.ownOn : t.userOn] : []),
    ...(disabled ? [t.disabled] : []),
    t.hint,
    t.file(path),
  ]
  return lines.join('\n')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Ctrl+Enter newline: status, on or off',
      argumentHint: '[status|on|off]',
    })

    if ((await $.store.get('disabled')) !== true) {
      const lang = await readLang($)
      const outcome = await enable($, lang)
      // say it once per change: a stored note keeps a conflict from nagging every session
      const note = (await $.store.get('note')) as string | undefined
      if (outcome.message !== TEXT[lang].on && outcome.message !== note) {
        $.ui.toast(outcome.message)
        await $.store.set('note', outcome.message)
      }
    }

    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e, next) => {
    const lang = await readLang($)
    const arg = e.args.trim().toLowerCase()

    if (arg === 'on') {
      await $.store.delete('disabled')
      await $.store.delete('note')
      return { text: (await enable($, lang)).message }
    }
    if (arg === 'off') {
      await $.store.set('disabled', true)
      return { text: `${(await disable($, lang)).message}\n${TEXT[lang].disabled}` }
    }

    return { text: await status($, lang) }
  })
}
