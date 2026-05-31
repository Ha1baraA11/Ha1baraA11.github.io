# Product

## Register

brand

## Users

Developer-readers and close personal contacts. They land here through a direct link, a GitHub profile, or word of mouth. Context: curiosity about who zetazero is, what they're building, and (for the select few who know the secret) the hidden love-letter archive.

## Product Purpose

A personal blog and digital garden. Not a portfolio in the "hire me" sense, but a space where code, reading, and personal history coexist. Success is: a visitor understands the author's voice within 30 seconds, and the hidden letters module works flawlessly for the one person it's built for.

## Brand Personality

Quiet, personal, technical. The handwriting hero animation sets the tone: this is someone who writes by hand, not someone who ships templates. The encrypted love-letter module adds a layer of intimacy beneath the developer surface. The Patrick Henry motto signals independence and conviction.

Three words: **restrained, intimate, opinionated**.

## Anti-references

- Generic SaaS landing pages (cream bg, gradient text, numbered sections, card grids, "supercharge your workflow")
- Corporate portfolio templates (stock photos, testimonial sliders, "John Doe, Full-Stack Developer" with a circular headshot)

The site should feel like a notebook someone keeps on their desk, not a pitch deck.

## Design Principles

1. **Preserve what's personal.** The handwriting animation, the hidden letters, the Caveat font, the blue accent, the dark default: these are identity, not decoration. Don't flatten them into generic polish.
2. **Add without removing.** Every existing component and feature is intentional. New additions layer on top; nothing gets stripped.
3. **Restraint is the voice.** The site says "here I am" quietly. Don't shout with motion, color, or layout. Let the few deliberate touches (the SVG stroke animation, the long-press secret, the reading progress bar) do the talking.
4. **Technical confidence without costume.** Code blocks, monospace where it earns its place, dark themes: these reflect the author's actual workflow. Don't add faux-technical decoration (grid lines, terminal aesthetics, neon glows) that isn't backed by real use.
5. **One hidden layer.** The letters module is the site's secret depth. Don't add more secrets or easter eggs; one is elegant, two is a theme park.

## Accessibility & Inclusion

- Dark/light theme toggle is already in place (respects `data-theme`)
- Reduced motion: animations should degrade gracefully (fade-in becomes instant, handwriting SVG should still render)
- Color contrast: `#64B5F6` on `#272B34` dark bg passes WCAG AA for large text; body text `#eee` on `#272B34` is well above 4.5:1
- No known user-specific accessibility needs at this time
