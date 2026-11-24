# Anastasi Bakolias — personal site

A static site for GitHub Pages: plain HTML, CSS and JavaScript, with no build step, no dependencies and no third-party requests.

The design is a telephone cord board. The switchboard was the first contact center and the first integration layer: an operator connecting people, line to line. In the hero, visitors can pull a cord off the shelf and plug it into a jack, and each labelled jack links to a section. The rest of the site uses the same hardware sparingly. Jacks are links, lamps show state, and cords are connections.

## Files

```
index.html                    home page: hero board, work, writing, projects, elsewhere, contact
work/example-case-study.html  template for a case study (with an architecture diagram)
writing/example-note.html     template for a note or guide (doubles as instructions)
404.html                      "Not in service" page, with a cord you can swing
bones/                        206 Bones, the built game (from the bones-206 project)
assets/css/site.css           all styles; design tokens are at the top
assets/js/site.js             lights on/off, nav lamps, clock, the cord board, the 404 cord
assets/fonts/                 Bricolage Grotesque and Newsreader (self-hosted, OFL licence files included)
assets/img/                   favicon, touch icon, social preview image (og.png)
.nojekyll                     tells GitHub Pages to serve the files as they are
```

## Publish on GitHub Pages

1. Create a repository named `spasiu.github.io` on your GitHub account.
2. Put these files at the root of the repository and push to `main`.
3. In the repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, then select `main` and `/ (root)`.
4. The site appears at `https://spasiu.github.io/` within a minute or two.

The link-preview tags near the top of `index.html` (`og:url` and `og:image`) already point at `https://spasiu.github.io/`. LinkedIn and Slack need those full addresses, so change them if the site moves.

**Project site instead** (`spasiu.github.io/REPO/`): everything works as it is, except `404.html`. Change its `<base href="/">` to `<base href="/REPO/">`.

**Custom domain:** add a file named `CNAME` that contains just the domain name, set up DNS as GitHub describes, and use that domain in the link-preview tags.

**Preview on your computer:** run `python3 -m http.server` in this folder and open http://localhost:8000. Opening `index.html` straight from the Finder also works, but some browsers won't load the fonts that way.

## Edit the content

Every spot meant for your words has an `<!-- EDIT -->` comment. Search for `EDIT` to find them all. The copy that's there now is placeholder, written at role level from what I know about you, so read all of it before you publish.

- **Title, description, link previews:** top of `index.html`.
- **Hero:** your name, the one-line role, the sentence under it, and the two buttons. Both CV links open your LinkedIn profile.
- **Availability:** the line under the buttons. `data-state="open"` shows a green lamp, `"limited"` amber, and `"closed"` an unlit lamp.
- **Work:** the bio paragraph, case-study rows and roles. Your current role links to dev3b.com; the other roles still have `20XX` and `Company name` placeholders.
- **Writing:** one row per note, newest first. `writing/example-note.html` explains how to add a page.
- **Projects:** each cover is a small inline SVG. To use a screenshot instead, replace the `<svg>` with `<img src="assets/img/your-image.jpg" alt="">`. Covers are 4:3.
- **Elsewhere:** keep, cut or rewrite any of the four items.
- **Contact:** your email, LinkedIn, GitHub and CV are filled in. If you change the email, change it in both the `href` and the text.
- **Clock:** the footer shows the time in Montréal. Change `data-tz` to any IANA time zone.

To remove a whole section, delete its `<section>` and its link in the masthead nav. If it has a jack on the board, delete that too, or relabel the jack to point somewhere else.

## Add a case study or a note

Copy `work/example-case-study.html` or `writing/example-note.html`, rename the copy with lowercase words and hyphens (`work/call-transcripts.html`), and replace the text. Then point a row on the home page at the new file. The case-study template's sample text describes how to write one, and the note template shows every element the long-form styles support.

## 206 Bones

`bones/` holds the built 206 Bones game, served at `https://spasiu.github.io/bones/` and linked from the 206 Bones card in Projects. It is the output of `npm run build` in the bones-206 project, copied in as it is. Leave out `_headers`, because GitHub Pages ignores it. The game credits its anatomy data under Options: BodyParts3D (CC BY 4.0) for the bones and most muscles, and Z-Anatomy (CC BY-SA 4.0) for twelve muscles, which puts the muscle file under CC BY-SA 4.0 as a whole.

To update it, rebuild the project, delete `bones/assets/`, and copy in the new `dist/index.html` and `dist/assets/`. The asset file names include a hash of their contents, so old files would otherwise pile up.

## The cord board

- **Jacks** are any element with `data-jack="Label"`. In the first row they're links (`<a href="#work">`), so a click goes to that section. The second row is for play. Its labels are Montréal-area phone codes (514, 438, 263, 450, 579).
- **Starting position:** `data-patch="Work"` on the `.board` element lists the jacks that cords plug into when the page loads, separated by commas. With one jack, a cord is carried over shortly after load. That is the page's one piece of motion that runs on its own.
- **Cords:** each `.board__hole` with `data-cord="red"`, `"ivory"` or `"black"` adds a cord and plug. Colours are in `CORDS` in `site.js`.
- **Behaviour:** drag a plug into a jack to connect it. Tap a plugged-in cord to put it back. Tap a resting plug and it hops. Plugs snap when the tip is within about 34px of a socket (`SNAP` in `site.js`).
- **Accessibility:** the board is a pointer toy and is hidden from screen readers. Keyboard and screen-reader visitors get the same destinations from the masthead nav.
- **Reduced motion:** if a visitor's system asks for less motion, cords start plugged in and don't swing.

## Colours and type

Tokens are at the top of `assets/css/site.css`. Each colour uses `light-dark(day, night)`, and the "Lights off" button switches between them. The choice is remembered per browser, and otherwise the site follows the system setting.

| Token | Day | Night | Use |
| --- | --- | --- | --- |
| `--bg` | `#E3E7E1` | `#141A17` | Page (telephone-equipment enamel) |
| `--ink` | `#1D2520` | `#E2E7E0` | Text |
| `--ink-2` | `#4A5550` | `#9EA9A2` | Secondary text |
| `--cord` | `#B4232C` | `#F0655D` | Links, focus rings |
| `--cord-fill` | `#B4232C` | `#C8352F` | Primary button |
| `--brass` | `#9A7329` | `#C9A04F` | Socket rings |
| `--lamp` | `#F7B538` | `#F7B538` | Lit lamps, text selection |
| `--board` | `#1D2520` | `#222B26` | The board (bakelite) |

The two typefaces are **Bricolage Grotesque** for headings and interface, and **Newsreader** for reading. Bricolage has ink traps, like the old phone-book typefaces. Body text sets at 18–21px, and the scale follows the classic typographic steps: 12, 14, 16, 18, 21, 24, 36, 48, 60, 72.

## Privacy

There are no analytics, cookies or trackers. The site's fonts are served from `assets/fonts`, so the site makes no outside requests. The one exception is the 206 Bones game, which loads its two fonts from Google Fonts. Browser storage holds only the light/dark choice and the game's progress, both in `localStorage`.

## Credits

Bricolage Grotesque © 2022 The Bricolage Grotesque Project Authors. Newsreader © 2020 The Newsreader Project Authors. Both are used under the SIL Open Font License 1.1, and the licence files are in `assets/fonts/`.
