"use client";

import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

type ChatMarkdownBlockProps = {
  mainContent: string;
  isCompact?: boolean;
};

export function ChatMarkdownBlock({ mainContent, isCompact }: ChatMarkdownBlockProps) {
  return (
    <ReactMarkdown
      skipHtml
      rehypePlugins={[rehypeSanitize]}
      disallowedElements={["script", "iframe", "object", "embed", "form"]}
      components={{
        p: (props) => <p className={isCompact ? "mb-2 last:mb-0" : "mb-6 last:mb-0"} {...props} />,
        h1: (props) => (
          <h1
            className={
              isCompact
                ? "text-sm font-black text-white mt-4 mb-2 border-l border-blue-600 pl-2 uppercase"
                : "text-xl font-black text-white mt-10 mb-4 border-l-2 border-blue-600 pl-4 uppercase"
            }
            {...props}
          />
        ),
        hr: () => <div className={isCompact ? "my-4 h-px bg-border" : "my-10 h-px bg-border"} />,
        pre: (props) => (
          <pre
            className="max-w-full overflow-x-auto whitespace-pre-wrap wrap-break-word rounded-2xl border border-border bg-bg-primary/70 p-4 text-xs text-text-secondary"
            {...props}
          />
        ),
        code: (props) => <code className="wrap-break-word whitespace-pre-wrap" {...props} />,
      }}
    >
      {mainContent}
    </ReactMarkdown>
  );
}
