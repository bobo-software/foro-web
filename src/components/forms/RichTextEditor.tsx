import { useEffect } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  LuBold,
  LuItalic,
  LuUnderline,
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuList,
  LuListOrdered,
  LuQuote,
  LuLink,
} from 'react-icons/lu';

interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  error?: string;
}

/**
 * TipTap editor limited to what the API's sanitiser keeps (headings, marks,
 * lists, quotes, links) — anything else would be stripped on save.
 */
export function RichTextEditor({ label, value, onChange, placeholder, error }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        link: { openOnClick: false, protocols: ['http', 'https', 'mailto'] },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'foro-rich-text min-h-[320px] px-4 py-3 focus:outline-none dark:text-slate-100',
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  // Load content that arrives after mount (e.g. editing an existing draft).
  // StrictMode replays effects against an editor useEditor has already destroyed.
  useEffect(() => {
    if (editor && !editor.isDestroyed && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>}
      <div
        className={`rounded-md border bg-white dark:bg-slate-900 ${
          error ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'
        } focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500`}
      >
        {editor && <Toolbar editor={editor} />}
        <EditorContent editor={editor} />
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      blockquote: e.isActive('blockquote'),
      link: e.isActive('link'),
    }),
  });

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', previous ?? 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const buttons = [
    { icon: LuBold, label: 'Bold', active: state.bold, run: () => editor.chain().focus().toggleBold().run() },
    { icon: LuItalic, label: 'Italic', active: state.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { icon: LuUnderline, label: 'Underline', active: state.underline, run: () => editor.chain().focus().toggleUnderline().run() },
    { icon: LuHeading1, label: 'Heading 1', active: state.h1, run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { icon: LuHeading2, label: 'Heading 2', active: state.h2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: LuHeading3, label: 'Heading 3', active: state.h3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { icon: LuList, label: 'Bullet list', active: state.bulletList, run: () => editor.chain().focus().toggleBulletList().run() },
    { icon: LuListOrdered, label: 'Numbered list', active: state.orderedList, run: () => editor.chain().focus().toggleOrderedList().run() },
    { icon: LuQuote, label: 'Quote', active: state.blockquote, run: () => editor.chain().focus().toggleBlockquote().run() },
    { icon: LuLink, label: 'Link', active: state.link, run: setLink },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 dark:border-slate-700 px-2 py-1">
      {buttons.map(({ icon: Icon, label, active, run }) => (
        <button
          key={label}
          type="button"
          onClick={run}
          title={label}
          aria-label={label}
          aria-pressed={active}
          className={`rounded p-1.5 transition-colors ${
            active
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100'
          }`}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}

export default RichTextEditor;
