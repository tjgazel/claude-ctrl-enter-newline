# ctrl-enter-newline

A [Claude Code](https://claude.com/claude-code) mod that makes **Ctrl+Enter insert a newline** in the prompt, as it does in the desktop app. Enter still sends the message.

By default Ctrl+Enter is bound to `chat:sendNow` and the newline key is Ctrl+J. This mod adds one binding to your `keybindings.json`:

```json
{ "context": "Chat", "bindings": { "ctrl+enter": "chat:newline" } }
```

Claude Code reloads that file on its own, so the change shows up without a restart. `chat:sendNow` stays available on Ctrl+X Ctrl+S.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install ctrl-enter-newline --marketplace tjgazel/claude-ctrl-enter-newline
```

Answer `y` to `Add marketplace?` and pick a scope. From a shell:

```
claude plugin install ctrl-enter-newline --marketplace tjgazel/claude-ctrl-enter-newline
```

The mod acts when a session starts. The first time it runs, a toast tells you what it changed.

## What it does to your files

- It **merges** the binding into `keybindings.json` and keeps everything else in the file. If the file does not exist it creates it.
- Before it changes an existing file it saves a copy next to it, once: `keybindings.json.ctrl-enter-newline.bak`.
- It **never overrides you**: if `Ctrl+Enter` already points to another action, or is set to `null`, it leaves the file alone and says so.
- If the file is not valid JSON it leaves it alone.
- The file is `CLAUDE_CONFIG_DIR/keybindings.json` when that variable is set, otherwise `~/.claude/keybindings.json` (`%USERPROFILE%\.claude` on Windows). It works the same on Windows, macOS and Linux.

## The `/ctrl-enter` command

| Command | Does |
| --- | --- |
| `/ctrl-enter` or `/ctrl-enter status` | Shows whether the binding is on and which file it is in |
| `/ctrl-enter off` | Removes the `ctrl+enter` binding **if it points to `chat:newline`** (whoever added it), and stops the mod from touching the file again |
| `/ctrl-enter on` | Turns it back on |

`/ctrl-enter off` never removes a `ctrl+enter` binding that points to another action. Uninstalling the plugin does not run any code, so run `/ctrl-enter off` first if you want the binding removed, or delete the `ctrl+enter` line from `keybindings.json` by hand.

## Your terminal has to cooperate

A terminal sees Ctrl+Enter as a different key from Enter only if it reports extended keys (for example through the Kitty keyboard protocol). Terminals that do not report them deliver Ctrl+Enter as a plain Enter, so Claude Code cannot tell them apart, and no mod or setting can change that.

To check, type a few words and press Ctrl+Enter. If you get a new line, you are set. If your message is sent, use **Ctrl+J**, which inserts a newline in every terminal, or switch to a terminal that reports extended keys.

## Language

Messages are in English, and in Portuguese when the `language` setting of Claude Code is Portuguese.

## Develop

```
claude --plugin-dir <path to this folder>
claude plugin validate .
claude plugin test .
```

The merge and removal logic is covered by `hooks/register.test.ts`.

## License

MIT, see [LICENSE](LICENSE).

---

## Português

Mod do Claude Code que faz o **Ctrl+Enter quebrar a linha** no prompt, como no app desktop. O Enter continua enviando a mensagem.

### Instalação

```
/plugin install ctrl-enter-newline --marketplace tjgazel/claude-ctrl-enter-newline
```

Responda `y` em `Add marketplace?` e escolha o escopo. O mod adiciona uma linha ao seu `keybindings.json` (`"ctrl+enter": "chat:newline"`), mesclando com o que já existe, guardando uma cópia do arquivo original e sem sobrescrever uma escolha sua. Use `/ctrl-enter status` para ver o estado e `/ctrl-enter off` para remover o atalho (só se ele apontar para `chat:newline`).

O terminal precisa informar o Ctrl+Enter como uma tecla diferente do Enter (protocolo de teclado Kitty ou similar). Se o Ctrl+Enter enviar a mensagem, use o **Ctrl+J**, que quebra a linha em qualquer terminal.
