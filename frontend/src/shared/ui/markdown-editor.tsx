import CharacterCount from "@tiptap/extension-character-count"
import Placeholder from "@tiptap/extension-placeholder"
import { Markdown } from "@tiptap/markdown"
import type { Editor } from "@tiptap/react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
    Bold,
    Check,
    ChevronDown,
    Code2,
    Heading1,
    Heading2,
    Heading3,
    Heading4,
    Italic,
    Link,
    List,
    ListOrdered,
    Pilcrow,
    Quote,
    Redo2,
    Underline,
    Undo2,
} from "lucide-react"
import { useEffect } from "react"
import { cn } from "@/shared/lib/class-names"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"

interface CharCountStorage {
    characterCount: { characters: () => number; words: () => number }
}

function getCharCount(editor: Editor): CharCountStorage {
    return editor.storage as unknown as CharCountStorage
}

interface BlockType {
    value: string
    label: string
    icon: React.ComponentType<{ className?: string }>
}

const BLOCK_TYPES: BlockType[] = [
    { value: "paragraph", label: "Paragraph", icon: Pilcrow },
    { value: "h1", label: "Heading 1", icon: Heading1 },
    { value: "h2", label: "Heading 2", icon: Heading2 },
    { value: "h3", label: "Heading 3", icon: Heading3 },
    { value: "h4", label: "Heading 4", icon: Heading4 },
    { value: "bullet", label: "Bulleted List", icon: List },
    { value: "number", label: "Numbered List", icon: ListOrdered },
    { value: "code", label: "Code Block", icon: Code2 },
    { value: "quote", label: "Quote", icon: Quote },
]

interface MarkdownEditorProps {
    value: string
    onChange: (value: string) => void
    onBlur?: () => void
    placeholder?: string
    maxLength?: number
}

export function MarkdownEditor({
    value,
    onChange,
    onBlur,
    placeholder,
    maxLength,
}: MarkdownEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4] },
            }),
            CharacterCount.configure({ limit: maxLength }),
            Placeholder.configure({
                placeholder: placeholder ?? "",
                showOnlyCurrent: false,
            }),
            Markdown,
        ],
        content: value || "<p></p>",
        contentType: value ? "markdown" : "html",
        onUpdate: ({ editor: e }) => {
            onChange(e.getMarkdown())
        },
        onBlur: () => onBlur?.(),
    })

    useEffect(() => {
        if (!editor) return
        const currentMd = editor.getMarkdown()
        if (value !== currentMd) {
            editor.commands.setContent(value, { contentType: "markdown" })
        }
    }, [value, editor])

    const isReady = editor !== null
    const charCount = editor ? getCharCount(editor).characterCount.characters() : 0
    const wordCount = editor ? getCharCount(editor).characterCount.words() : 0

    return (
        <div className="overflow-hidden rounded-sm border border-ds-surface-border transition-[color,box-shadow] focus-within:border-ds-gray-600 focus-within:ring-[3px] focus-within:ring-ds-gray-600/40">
            {isReady ? (
                <>
                    <div className="flex items-center gap-0.5 border-ds-surface-border border-b bg-ds-surface px-1 py-1">
                        <ToolbarGroup>
                            <ToolbarButton
                                icon={Undo2}
                                label="Undo"
                                shortcut="⌘Z"
                                disabled={!editor.can().undo()}
                                onClick={() => editor.chain().focus().undo().run()}
                            />
                            <ToolbarButton
                                icon={Redo2}
                                label="Redo"
                                shortcut="⇧⌘Z"
                                disabled={!editor.can().redo()}
                                onClick={() => editor.chain().focus().redo().run()}
                            />
                        </ToolbarGroup>

                        <ToolbarSeparator />

                        <BlockTypeSelect editor={editor} />

                        <ToolbarSeparator />

                        <ToolbarGroup>
                            <ToolbarButton
                                icon={Bold}
                                label="Bold"
                                shortcut="⌘B"
                                active={editor.isActive("bold")}
                                onClick={() => editor.chain().focus().toggleBold().run()}
                            />
                            <ToolbarButton
                                icon={Italic}
                                label="Italic"
                                shortcut="⌘I"
                                active={editor.isActive("italic")}
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                            />
                            <ToolbarButton
                                icon={Underline}
                                label="Underline"
                                shortcut="⌘U"
                                active={editor.isActive("underline")}
                                onClick={() => editor.chain().focus().toggleUnderline().run()}
                            />
                        </ToolbarGroup>

                        <ToolbarSeparator />

                        <ToolbarGroup>
                            <ToolbarButton
                                icon={Link}
                                label="Link"
                                shortcut="⌘K"
                                active={editor.isActive("link")}
                                onClick={() => {
                                    if (editor.isActive("link")) {
                                        editor.chain().focus().unsetLink().run()
                                        return
                                    }
                                    const url = window.prompt("URL")
                                    if (url) {
                                        editor.chain().focus().setLink({ href: url }).run()
                                    }
                                }}
                            />
                        </ToolbarGroup>
                    </div>

                    {/* biome-ignore lint/a11y/useSemanticElements: role="textbox" wraps a tiptap editor that owns its own keyboard handling */}
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: tiptap editor owns keyboard handling internally */}
                    <div
                        role="textbox"
                        tabIndex={-1}
                        className="tiptap-editor-content h-[320px] overflow-y-auto [&_.tiptap]:min-h-full [&_.tiptap]:p-6 [&_.tiptap]:outline-none"
                        onClick={() => editor.commands.focus()}
                    >
                        <EditorContent editor={editor} />
                    </div>

                    <div className="flex items-center justify-center border-ds-surface-border border-t px-3 py-2.5">
                        <p className="text-ds-fg-muted text-xs">
                            {charCount} {charCount === 1 ? "character" : "characters"} | {wordCount}{" "}
                            {wordCount === 1 ? "word" : "words"}
                        </p>
                    </div>
                </>
            ) : (
                <EditorSkeleton />
            )}
        </div>
    )
}

function EditorSkeleton() {
    return (
        <>
            <div className="flex items-center gap-0.5 border-ds-surface-border border-b bg-ds-surface px-1 py-1">
                <div className="flex items-center gap-0.5">
                    <div className="size-8 animate-pulse rounded-sm bg-ds-gray-200" />
                    <div className="size-8 animate-pulse rounded-sm bg-ds-gray-200" />
                </div>
                <div className="mx-0.5 h-4 w-px bg-ds-surface-border" />
                <div className="h-8 w-[130px] animate-pulse rounded-sm bg-ds-gray-200" />
                <div className="mx-0.5 h-4 w-px bg-ds-surface-border" />
                <div className="flex items-center gap-0.5">
                    <div className="size-8 animate-pulse rounded-sm bg-ds-gray-200" />
                    <div className="size-8 animate-pulse rounded-sm bg-ds-gray-200" />
                    <div className="size-8 animate-pulse rounded-sm bg-ds-gray-200" />
                </div>
                <div className="mx-0.5 h-4 w-px bg-ds-surface-border" />
                <div className="size-8 animate-pulse rounded-sm bg-ds-gray-200" />
            </div>

            <div className="min-h-[240px] space-y-4 px-4 py-5">
                <div className="h-5 w-3/5 animate-pulse rounded bg-ds-gray-200" />
                <div className="space-y-2.5">
                    <div className="h-3.5 w-full animate-pulse rounded bg-ds-gray-200" />
                    <div className="h-3.5 w-11/12 animate-pulse rounded bg-ds-gray-200" />
                    <div className="h-3.5 w-4/5 animate-pulse rounded bg-ds-gray-200" />
                </div>
                <div className="h-5 w-2/5 animate-pulse rounded bg-ds-gray-200" />
                <div className="space-y-2.5">
                    <div className="h-3.5 w-full animate-pulse rounded bg-ds-gray-200" />
                    <div className="h-3.5 w-10/12 animate-pulse rounded bg-ds-gray-200" />
                </div>
            </div>

            <div className="flex items-center justify-center border-ds-surface-border border-t px-3 py-2.5">
                <div className="h-3.5 w-40 animate-pulse rounded bg-ds-gray-200" />
            </div>
        </>
    )
}

function getActiveBlockType(editor: Editor | null): string {
    if (!editor) return "paragraph"
    if (editor.isActive("heading", { level: 1 })) return "h1"
    if (editor.isActive("heading", { level: 2 })) return "h2"
    if (editor.isActive("heading", { level: 3 })) return "h3"
    if (editor.isActive("heading", { level: 4 })) return "h4"
    if (editor.isActive("bulletList")) return "bullet"
    if (editor.isActive("orderedList")) return "number"
    if (editor.isActive("codeBlock")) return "code"
    if (editor.isActive("blockquote")) return "quote"
    return "paragraph"
}

function applyBlockType(editor: Editor, blockType: string): void {
    const chain = editor.chain().focus()
    switch (blockType) {
        case "h1":
            chain.toggleHeading({ level: 1 }).run()
            break
        case "h2":
            chain.toggleHeading({ level: 2 }).run()
            break
        case "h3":
            chain.toggleHeading({ level: 3 }).run()
            break
        case "h4":
            chain.toggleHeading({ level: 4 }).run()
            break
        case "bullet":
            chain.toggleBulletList().run()
            break
        case "number":
            chain.toggleOrderedList().run()
            break
        case "code":
            chain.toggleCodeBlock().run()
            break
        case "quote":
            chain.toggleBlockquote().run()
            break
        default:
            chain.setParagraph().run()
            break
    }
}

function BlockTypeSelect({ editor }: { editor: Editor | null }) {
    const activeValue = getActiveBlockType(editor)
    const activeBlock = BLOCK_TYPES.find((b) => b.value === activeValue) ?? BLOCK_TYPES[0]
    const ActiveIcon = activeBlock.icon

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex h-8 min-w-[130px] items-center justify-between gap-1.5 rounded-sm border border-ds-surface-border bg-ds-surface px-2 font-medium text-xs outline-none transition-colors hover:bg-ds-surface-interactive focus-visible:border-ds-gray-600 [&_svg]:size-3">
                <span className="flex items-center gap-1.5">
                    <ActiveIcon className="text-ds-fg-muted" />
                    {activeBlock.label}
                </span>
                <ChevronDown className="text-ds-fg-muted" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[180px]">
                {BLOCK_TYPES.map((block) => {
                    const Icon = block.icon
                    const isActive = block.value === activeValue
                    return (
                        <DropdownMenuItem
                            key={block.value}
                            onSelect={() => {
                                if (editor) applyBlockType(editor, block.value)
                            }}
                            className="justify-between text-xs"
                        >
                            <span className="flex items-center gap-2">
                                <Icon className="size-3.5 text-ds-fg-muted" />
                                {block.label}
                            </span>
                            {isActive && <Check className="size-3.5 text-ds-fg" />}
                        </DropdownMenuItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
    return <div className="flex items-center gap-0.5">{children}</div>
}

function ToolbarSeparator() {
    return <div className="mx-0.5 h-4 w-px bg-ds-surface-border" />
}

interface ToolbarButtonProps {
    icon: React.ComponentType<{ className?: string }>
    label: string
    onClick: () => void
    shortcut?: string
    active?: boolean
    disabled?: boolean
}

function ToolbarButton({
    icon: Icon,
    label,
    onClick,
    shortcut,
    active,
    disabled,
}: ToolbarButtonProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={onClick}
                    disabled={disabled}
                    className={cn(
                        "flex size-8 items-center justify-center rounded-sm border border-ds-surface-border bg-ds-surface text-ds-fg-muted",
                        "hover:bg-ds-surface-interactive hover:text-ds-fg",
                        "transition-colors",
                        active && "bg-ds-gray-300 text-ds-fg",
                        disabled && "pointer-events-none opacity-40"
                    )}
                >
                    <Icon className="size-3.5" />
                </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
                <span>{label}</span>
                {shortcut && <span className="ml-2 text-[10px] text-ds-fg-muted">{shortcut}</span>}
            </TooltipContent>
        </Tooltip>
    )
}
