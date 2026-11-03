import React from 'react';

/**
 * Renders message text with markdown bold (**text**), inline code (`code`),
 * headers (### / ##), dividers (---), and bulleted lists (* item / - item).
 */
export default function MarkdownMessage({ content, isUser = false }) {
  if (!content) return null;

  const lines = String(content).split('\n');

  const renderInline = (text) => {
    if (!text) return null;
    const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong
            key={i}
            className={`font-black tracking-tight ${isUser ? 'text-white' : 'text-gray-950 font-bold'}`}
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code
            key={i}
            className={`px-1 py-0.2 rounded font-mono text-[10.5px] ${
              isUser
                ? 'bg-white/20 text-white font-medium'
                : 'bg-gray-100 text-indigo-700 border border-gray-200 font-semibold'
            }`}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-0.5 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Horizontal divider (--- or ***)
        if (trimmed === '---' || trimmed === '***') {
          return (
            <hr
              key={idx}
              className={`my-1.5 border-t ${isUser ? 'border-white/20' : 'border-gray-200'}`}
            />
          );
        }

        // Headings (###, ##, #)
        if (trimmed.startsWith('#')) {
          const headingText = trimmed.replace(/^#+\s*/, '');
          return (
            <div
              key={idx}
              className={`font-extrabold text-[12px] mt-1.5 mb-0.5 ${
                isUser ? 'text-white' : 'text-gray-950'
              }`}
            >
              {renderInline(headingText)}
            </div>
          );
        }

        // Bullet lists (* or -)
        if (/^[*•-]\s+/.test(trimmed)) {
          const bulletText = trimmed.replace(/^[*•-]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-0.5 my-0.5">
              <span
                className={`text-[8px] select-none mt-1 shrink-0 ${
                  isUser ? 'text-white/80' : 'text-indigo-600 font-bold'
                }`}
              >
                ●
              </span>
              <div className="flex-1">{renderInline(bulletText)}</div>
            </div>
          );
        }

        // Numbered list (1. 2. etc)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          const [, num, numText] = numMatch;
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-0.5 my-0.5">
              <span
                className={`text-[10.5px] font-bold select-none mt-0.2 shrink-0 ${
                  isUser ? 'text-white/80' : 'text-indigo-700'
                }`}
              >
                {num}.
              </span>
              <div className="flex-1">{renderInline(numText)}</div>
            </div>
          );
        }

        // Normal line
        return (
          <p key={idx} className="my-0.5">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}
