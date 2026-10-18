import { expect, test } from 'claude-code/testing'

import { addBinding, fresh, isCtrlEnter, langOf, removeBinding, stateOf } from './register'

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`
const parsed = (text: string) => JSON.parse(text)

test('recognizes Ctrl+Enter however it is spelled', () => {
  for (const key of ['ctrl+enter', 'Ctrl+Enter', 'CTRL+ENTER', 'control+return', 'enter+ctrl', ' ctrl + enter ']) {
    expect(isCtrlEnter(key)).toBe(true)
  }
  for (const key of ['enter', 'ctrl+j', 'ctrl+shift+enter', 'shift+enter', 'ctrl+x enter', 'alt+enter']) {
    expect(isCtrlEnter(key)).toBe(false)
  }
})

test('a missing or empty file gets a complete one', () => {
  for (const text of [undefined, '', '  \n']) {
    const change = addBinding(text)
    expect(change.result).toBe('added')
    expect(parsed(change.text)).toEqual({
      $schema: 'https://www.schemastore.org/claude-code-keybindings.json',
      $docs: 'https://code.claude.com/docs/en/keybindings',
      bindings: [{ context: 'Chat', bindings: { 'ctrl+enter': 'chat:newline' } }],
    })
  }
  expect(fresh().endsWith('\n')).toBe(true)
})

test('merges into an existing Chat block and keeps everything else', () => {
  const before = json({
    $schema: 'x',
    bindings: [
      { context: 'Global', bindings: { 'ctrl+k ctrl+t': 'app:toggleTodos' } },
      { context: 'Chat', bindings: { 'ctrl+e': 'chat:externalEditor', 'ctrl+s': null } },
    ],
  })
  const change = addBinding(before)
  expect(change.result).toBe('added')
  expect(parsed(change.text)).toEqual({
    $schema: 'x',
    bindings: [
      { context: 'Global', bindings: { 'ctrl+k ctrl+t': 'app:toggleTodos' } },
      {
        context: 'Chat',
        bindings: { 'ctrl+e': 'chat:externalEditor', 'ctrl+s': null, 'ctrl+enter': 'chat:newline' },
      },
    ],
  })
})

test('adds a Chat block when the file has none', () => {
  const change = addBinding(json({ bindings: [{ context: 'Global', bindings: { 'ctrl+t': null } }] }))
  expect(change.result).toBe('added')
  expect(parsed(change.text).bindings).toEqual([
    { context: 'Global', bindings: { 'ctrl+t': null } },
    { context: 'Chat', bindings: { 'ctrl+enter': 'chat:newline' } },
  ])
})

test('adding twice changes nothing', () => {
  const once = addBinding(undefined).text
  const twice = addBinding(once)
  expect(twice.result).toBe('already')
  expect(twice.text).toBe(once)
})

test('respects a binding the user chose, in any spelling', () => {
  for (const [key, action] of [
    ['ctrl+enter', 'chat:submit'],
    ['Ctrl+Return', 'chat:queueSubmit'],
    ['ctrl+enter', null],
  ] as const) {
    const before = json({ bindings: [{ context: 'Chat', bindings: { [key]: action } }] })
    const change = addBinding(before)
    expect(change.result).toBe('conflict')
    expect(change.text).toBe(before)
  }
  const mixed = json({ bindings: [{ context: 'Chat', bindings: { 'Ctrl+Enter': 'chat:newline' } }] })
  expect(addBinding(mixed).result).toBe('already')
})

test('does not touch a file it cannot read', () => {
  for (const text of ['{ not json', '[]', '{"bindings": {}}', '{"nothing": true}']) {
    const change = addBinding(text)
    expect(change.result).toBe('invalid')
    expect(change.text).toBe(text)
  }
})

test('removes only its own binding and tidies an empty block', () => {
  const ours = addBinding(undefined).text
  const gone = removeBinding(ours)
  expect(gone.result).toBe('removed')
  expect(parsed(gone.text).bindings).toEqual([])

  const shared = json({
    bindings: [{ context: 'Chat', bindings: { 'ctrl+e': 'chat:externalEditor', 'ctrl+enter': 'chat:newline' } }],
  })
  expect(parsed(removeBinding(shared).text).bindings).toEqual([
    { context: 'Chat', bindings: { 'ctrl+e': 'chat:externalEditor' } },
  ])
})

test('does not remove a binding that is not chat:newline', () => {
  const before = json({ bindings: [{ context: 'Chat', bindings: { 'ctrl+enter': 'chat:submit' } }] })
  const change = removeBinding(before)
  expect(change.result).toBe('conflict')
  expect(change.text).toBe(before)
  expect(removeBinding(undefined).result).toBe('absent')
  expect(removeBinding(json({ bindings: [] })).result).toBe('absent')
  expect(removeBinding('{ bad').result).toBe('invalid')
})

test('reports the state of a file', () => {
  expect(stateOf(undefined)).toBe('off')
  expect(stateOf(fresh())).toBe('on')
  expect(stateOf(json({ bindings: [{ context: 'Chat', bindings: { 'ctrl+enter': 'chat:submit' } }] }))).toBe('other')
  expect(stateOf('nope')).toBe('invalid')
  expect(stateOf(json({ bindings: [] }))).toBe('off')
})

test('reads the language setting', () => {
  expect(['portuguese', 'Português', 'pt', 'pt-BR'].map(langOf)).toEqual(Array(4).fill('pt'))
  expect([undefined, 'english', 'spanish', 42].map(langOf)).toEqual(Array(4).fill('en'))
})
