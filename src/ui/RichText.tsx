import { parseInline } from "@/content";
import type { Block } from "@/content";
import { Board } from "./Board";

/** Text with **bold** parts. */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((span, i) =>
        span.bold ? (
          <strong key={i} className="font-extrabold text-brand-dark">
            {span.text}
          </strong>
        ) : (
          <span key={i}>{span.text}</span>
        ),
      )}
    </>
  );
}

/** Turns a lesson's explanation blocks into elements. It only draws: all the words come from content/. */
export function RichText({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return (
              <h2 key={i} className="pt-2 text-2xl font-extrabold text-brand">
                <Inline text={block.text} />
              </h2>
            );
          case "paragraph":
            return (
              <p key={i} className="text-lg leading-relaxed">
                <Inline text={block.text} />
              </p>
            );
          case "list":
            return (
              <ul key={i} className="list-disc space-y-2 pl-6 text-lg leading-relaxed">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            );
          case "diagram":
            return (
              <figure key={i} className="mx-auto w-full max-w-xs">
                <Board
                  fen={block.fen}
                  turn={block.fen.split(" ")[1] === "b" ? "black" : "white"}
                  orientation={block.orientation ?? "white"}
                  highlights={block.highlights}
                  arrows={block.arrows}
                />
                {block.caption && (
                  <figcaption className="mt-2 text-center text-sm text-ink/70">
                    <Inline text={block.caption} />
                  </figcaption>
                )}
              </figure>
            );
        }
      })}
    </div>
  );
}
