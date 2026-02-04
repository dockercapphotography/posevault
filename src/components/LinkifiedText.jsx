/**
 * Component that automatically converts URLs in text to clickable links
 */
export default function LinkifiedText({ text, className = '' }) {
  if (!text) return null;

  // Regex to match URLs (http, https, and www)
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

  const parts = text.split(urlRegex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          // Ensure URL has protocol
          const href = part.startsWith('www.') ? `https://${part}` : part;
          // Clean up trailing punctuation that might have been captured
          const cleanHref = href.replace(/[.,;:!?)]+$/, '');
          const trailingPunctuation = href.slice(cleanHref.length);

          return (
            <span key={index}>
              <a
                href={cleanHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 underline"
                onClick={(e) => e.stopPropagation()}
              >
                {part.replace(/[.,;:!?)]+$/, '')}
              </a>
              {trailingPunctuation}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
