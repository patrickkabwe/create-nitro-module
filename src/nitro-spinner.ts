interface LoggerOptions {
    frames?: string[]
    interval?: number
    color?: string
}

type LogLevel = 'info' | 'success' | 'warning' | 'error'

export class NitroSpinner {
    private readonly frames: string[]
    private readonly interval: number
    private readonly colors: Record<string, string>
    private readonly symbols: Record<LogLevel, string>
    private currentFrame: number
    private isSpinning: boolean
    private spinnerInterval: NodeJS.Timeout | null
    private readonly stdout: NodeJS.WriteStream
    public text: string = ''

    constructor(options: LoggerOptions = {}) {
        this.frames = options.frames ?? [
            '⠋',
            '⠙',
            '⠹',
            '⠸',
            '⠼',
            '⠴',
            '⠦',
            '⠧',
            '⠇',
            '⠏',
        ]
        this.interval = options.interval ?? 80
        this.colors = {
            reset: '\x1b[0m',
            cyan: '\x1b[36m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            red: '\x1b[31m',
        } as const
        this.symbols = {
            info: 'ℹ',
            success: '✓',
            warning: '⚠',
            error: '✖',
        }
        this.currentFrame = 0
        this.isSpinning = false
        this.spinnerInterval = null
        this.stdout = process.stdout
        this.text = ''
    }

    private write(text: string, clearLine = true): void {
        if (clearLine) {
            this.stdout.clearLine(0)
            this.stdout.cursorTo(0)
        }
        this.stdout.write(text)
    }

    private stopSpinner(): void {
        if (this.spinnerInterval) {
            clearInterval(this.spinnerInterval)
            this.spinnerInterval = null
        }
    }

    public start(text: string): this {
        this.stopSpinner()
        this.text = text
        this.isSpinning = true

        this.spinnerInterval = setInterval(() => {
            const frame = this.frames[this.currentFrame]
            this.write(
                `${this.colors.cyan}${frame}${this.colors.reset} ${text}`
            )
            this.currentFrame = (this.currentFrame + 1) % this.frames.length
        }, this.interval)

        return this
    }

    public update(text: string): this {
        if (this.text) {
            this.succeed(this.text)
        }
        return this.start(text)
    }

    public succeed(text?: string): this {
        this.stopSpinner()
        this.write(
            `${this.colors.green}${this.symbols.success}${this.colors.reset} ${text ?? this.text}\n`
        )
        this.isSpinning = false
        this.text = ''
        return this
    }

    public warn(text: string): this {
        this.stopSpinner()
        this.write(
            `${this.colors.yellow}${this.symbols.warning}${this.colors.reset} ${text}\n`
        )
        this.isSpinning = false
        this.text = ''
        return this
    }

    public fail(text: string): this {
        this.stopSpinner()
        this.write(
            `${this.colors.red}${this.symbols.error}${this.colors.reset} ${text}\n`
        )
        this.isSpinning = false
        this.text = ''
        return this
    }

    public info(text: string): this {
        this.stopSpinner()
        this.write(
            `${this.colors.cyan}${this.symbols.info}${this.colors.reset} ${text}\n`
        )
        this.isSpinning = false
        this.text = ''
        return this
    }

    public stop(finalText?: string): this {
        if (this.text) {
            this.succeed(this.text)
        }

        if (finalText) {
            this.succeed(finalText)
        }

        this.stopSpinner()
        this.isSpinning = false
        this.text = ''
        return this
    }
}
