
import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';
import { Card } from './ui/card';

interface CodeEditorProps {
  code: string;
  onChange?: (value: string | undefined) => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
}

export function CodeEditor({
  code,
  onChange,
  language = 'python',
  readOnly = false,
  height = '60vh'
}: CodeEditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    setIsLoading(false);
    
    // Configure editor for better Python indentation handling
    if (language === 'python') {
      editor.updateOptions({
        tabSize: 4,
        insertSpaces: true,
        detectIndentation: true,
        autoIndent: 'full',
      });
    }
  };

  useEffect(() => {
    // Update editor content when code prop changes
    if (editorRef.current && code !== editorRef.current.getValue()) {
      editorRef.current.setValue(code);
    }
  }, [code]);

  return (
    <Card className="relative border border-muted rounded-md overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <Editor
        height={height}
        defaultLanguage={language}
        defaultValue={code}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          tabSize: language === 'python' ? 4 : 2,
          readOnly,
          wordWrap: 'on',
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          automaticLayout: true,
          autoIndent: 'full',
          detectIndentation: true,
          insertSpaces: true
        }}
        onMount={handleEditorDidMount}
        onChange={onChange}
      />
    </Card>
  );
}
