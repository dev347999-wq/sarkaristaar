"use client";

import { useState } from "react";
import { Save, X, Type, List, ListOrdered, Image as ImageIcon, Link as LinkIcon } from "lucide-react";

export interface NotesEditorProps {
  initialTitle?: string;
  initialContent?: string;
  onSave?: (title: string, content: string) => void;
  onCancel?: () => void;
}

export function NotesEditor({ initialTitle = "", initialContent = "", onSave, onCancel }: NotesEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
      <div className="border-b border-border p-4 flex items-center justify-between bg-muted/20">
        <input 
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note Title..."
          className="text-xl font-bold bg-transparent border-none outline-none flex-1 placeholder:text-muted-foreground/50"
        />
        <div className="flex items-center gap-2">
          {onCancel && (
            <button 
              onClick={onCancel}
              className="p-2 text-muted-foreground hover:bg-muted rounded-md transition-colors"
              aria-label="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => onSave?.(title, content)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
          >
            <Save className="w-4 h-4" />
            Save Note
          </button>
        </div>
      </div>
      
      <div className="border-b border-border p-2 flex items-center gap-1 bg-background text-muted-foreground">
        <ToolbarButton icon={<Type className="w-4 h-4" />} title="Format Text" />
        <ToolbarButton icon={<List className="w-4 h-4" />} title="Bullet List" />
        <ToolbarButton icon={<ListOrdered className="w-4 h-4" />} title="Numbered List" />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton icon={<ImageIcon className="w-4 h-4" />} title="Insert Image" />
        <ToolbarButton icon={<LinkIcon className="w-4 h-4" />} title="Insert Link" />
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Start writing your notes here... (Markdown supported)"
        className="flex-1 w-full p-6 bg-transparent border-none resize-none outline-none text-foreground leading-relaxed focus:ring-0"
      />
    </div>
  );
}

function ToolbarButton({ icon, title }: { icon: React.ReactNode, title: string }) {
  return (
    <button 
      title={title}
      className="p-2 hover:bg-muted hover:text-foreground rounded transition-colors"
    >
      {icon}
    </button>
  );
}
