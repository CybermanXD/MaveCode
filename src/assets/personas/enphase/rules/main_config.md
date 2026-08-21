# Enphase Main Email Reference Configuration

Source reviewed: `references/Enphase_Main_Reference.html`

## Purpose

- This file captures reusable learnings, standards, and block patterns from the Enphase main reference HTML.
- Use these notes when creating any Enphase/SFMC email project inside project folders.
- Keep this config updated whenever a new reusable pattern, bug, fix, or client-specific rule is discovered.

## Core Email Framework

- Use XHTML Transitional doctype for broad email-client compatibility.
- Include Outlook/MSO namespaces on the `html` tag:
    - `xmlns:v="urn:schemas-microsoft-com:vml"`
    - `xmlns:o="urn:schemas-microsoft-com:office:office"`
- Include MSO Office settings in the head:
    - `o:AllowPNG`
    - `o:PixelsPerInch` set to `96`
- Base layout is table-driven and should remain table-first for email compatibility.
- Main email body uses a centered `600px` container table.
- Outer wrapper uses `width="100%"`, `table-layout:fixed`, and centered inner `600px` table.
- All production modules should use nested `table > tr > td` structures, not modern CSS layout such as flex/grid.

## Head and Meta Standards

- Use UTF-8 charset.
- Include `X-UA-Compatible` set to `IE=edge`.
- Include mobile viewport meta.
- Include `format-detection="telephone=no"` to prevent automatic phone styling.
- Title is currently placeholder in the reference; replace `-- Page Title --` per campaign.

## Global CSS Reset Standards

- Body reset:
    - `margin:0`
    - `padding:0`
    - `-webkit-text-size-adjust:100% !important`
    - `-ms-text-size-adjust:100% !important`
    - `-webkit-font-smoothing:antialiased !important`
- Image reset:
    - `border:0 !important`
    - `outline:none !important`
    - `display:block` inline on actual images.
- Table reset:
    - `border-collapse:collapse`
    - `mso-table-lspace:0px`
    - `mso-table-rspace:0px`
- Use `mso-line-height-rule:exactly` on text-bearing elements/classes where possible.
- Keep `.ExternalClass * { line-height:100%; }` for Outlook.com/legacy compatibility.
- Use Apple/Gmail data detector reset selector:
    - `a[x-apple-data-detectors], u + .em_body a, #MessageViewBody a`

## Main Wrapper Classes

- `.em_body`: applied on `body` with white background.
- `.em_full_wrap`: full-width outer table wrapper.
- `.em_main_table`: fixed `600px` center container, becomes `100%` on mobile.
- `.em_wrapper`: reusable class for tables that become full-width on mobile.
- `.em_defaultlink`: makes nested links inherit color and remove text decoration.
- `.em_defaultlink1`: keeps inherited color but underlines nested links.

## Brand Font Source Rules

- Brand webfonts are defined in `css2.txt` through `@font-face` declarations and should remain the source of truth for Enphase font-family naming.
- Approved font families available from the references:
    - `'enphase-visuelt-regular'`
    - `'enphase-visuelt-medium'`
    - `'enphase-visuelt-semibold'`
    - `'enphase-visuelt-bold'`
    - `'enphase-visuelt-extrabold'`
    - `'enphase-visuelt-black'`
- Always include `Arial, sans-serif` as fallback after Enphase font families in inline text styles.
- Use weight-family pairing consistently:
    - regular copy: `'enphase-visuelt-regular'`
    - medium CTA/support emphasis: `'enphase-visuelt-medium'`
    - semibold emphasis where needed: `'enphase-visuelt-semibold'`
    - bold headline or strong emphasis: `'enphase-visuelt-bold'`
- Do not invent alternate Enphase font-family names; reuse the exact names declared in `css2.txt`.

## Complete Main Reference Class Inventory

- Future Enphase email builds must reuse classes from `references/Enphase_Main_Reference.html`, `references/css1.txt`, and `references/css2.txt` only.
- Core layout/body classes:
    - `.em_body`
    - `.em_full_wrap`
    - `.em_main_table`
    - `.em_wrapper`
    - `.em_clear`
    - `.em_hide`
    - `.em_hide_desktop`
    - `.em_mob_block`
    - `.em_hauto`
    - `.em_bgnone`
    - `.em_full_img`
    - `.em_g_img`
- Default link/text behavior classes:
    - `.em_defaultlink`
    - `.em_defaultlink1`
    - `.LH100P`
    - `.em_brk`
- Stacking and column classes:
    - `.stack-2`
    - `.stack-3`
    - `.stack-gap`
    - `.fluid-container`
    - `.mobile-padding`
- Side spacer and side padding classes:
    - `.em_side10`
    - `.em_side15`
    - `.em_side60`
    - `.em_aside`
    - `.em_aside1`
    - `.em_aside2`
    - `.em_aside3`
    - `.em_aside4`
    - `.em_aside5`
    - `.em_aside6`
    - `.em_aside10`
    - `.em_aside15`
    - `.em_aside30`
    - `.em_aside45`
    - `.em_padl15`
- Padding utility classes:
    - `.em_padd_none`
    - `.em_padd_bottom_none`
    - `.em_padd_top_bottom`
    - `.em_pbottom`
    - `.em_pbottom10`
    - `.em_pbottom30`
    - `.em_pbottom40`
    - `.em_ptop`
    - `.em_ptop1`
    - `.em_ptop2`
    - `.em_ptop_5`
    - `.em_ptop_10`
    - `.em_ptop_15`
    - `.em_ptop30`
    - `.em_ptop40`
    - `.em_pxy1`
    - `.em_pxy1_1`
    - `.em_pxy2`
    - `.em_pxy3`
    - `.em_pxy4`
    - `.em_pxy5`
    - `.em_pxy6`
    - `.em_pxy7`
    - `.em_pxy8`
- Height/spacer classes:
    - `.em_h20`
    - `.em_h30`
    - `.em_h340`
- CTA classes:
    - `.em_cta`
    - `.em_cta1`
    - `.em_width_cta_new`
    - `.em_width_cta_new160`
    - `.em_width_cta_new1`
    - `.em_font_cta_new`
    - `.em_font_cta_new1`
    - `.em_font_cta_new2`
    - `.em_fs_cta`
- Font-size and typography classes:
    - `.em_font10`
    - `.em_font13`
    - `.em_font18`
    - `.em_font20`
    - `.em_font20li`
    - `.em_font20x`
    - `.em_font22`
    - `.em_font22a`
    - `.em_font25`
    - `.em_font30`
    - `.em_font33`
    - `.em_font50`
    - `.em_font80`
    - `.em_font_16`
    - `.em_font_16_list`
    - `.em_font_16_table`
    - `.em_font_20`
    - `.em_font_24`
    - `.em_font_32`
    - `.em_font_42`
    - `.em_font_42_1`
    - `.em_font_50`
    - `.em_font_50_1`
    - `.em_font_58`
    - `.em_font_68`
    - `.em_font_72`
    - `.em_font_110`
    - `.em_font_150`
    - `.em_fnt20`
    - `.em_fnt30`
    - `.em_fnt44`
    - `.em_fnt50`
    - `.em_fnt_22`
    - `.em_fnt_30`
    - `.em_fnt_40`
    - `.em_mb_fnt24`
    - `.em_mb_fnt30`
    - `.em_nw_font50`
    - `.em_text_20`
    - `.em_fs20`
    - `.em_thf16`
    - `.em_tdf15`
- Image/icon sizing classes:
    - `.em_icon`
    - `.em_icon_resize`
    - `.em_logo_img`
    - `.em_octopus_resize`
    - `.em_round_icon_size`
    - `.center-img`
    - `.app-btn`
    - `.wid-60_img`
    - `.thum_img`
    - `.cal_img`
    - `.em_w50`
- Background/image utility classes:
    - `.em_dotted_bg`
    - `.em_dotted_bg2`
- Bullet/list support classes:
    - `.em_bullet_td`
- SFMC wrapper classes seen in reference exports:
    - `.stylingblock-content-wrapper`
    - `.camarker-inner`

## Class Usage Rules Calculated From Main Reference

- Must-use shell classes for every generated Enphase email:
    - `body class="em_body"`
    - outer wrapper table `class="em_full_wrap"`
    - inner 600px table `class="em_main_table"`
- Use `.em_wrapper` for any table that needs to become `100%` width on mobile.
- Use `.em_aside15` for most mobile side padding overrides on wrapper `td` cells.
- Use `.em_defaultlink` on text-bearing `td` cells so links inherit the intended text color and decoration.
- Use `.em_full_img` on image wrapper cells when an image must scale down fluidly on mobile.
- Use `.em_clear` on side-by-side cells that must stack on mobile.
- Use `.em_hide` for spacer cells or content that should disappear on mobile.
- Use `.em_cta` for all large pill CTAs that need mobile height/font adjustments.
- Use `.em_font_cta_new*` and `.em_width_cta_new*` for CTA text/width adjustments in compact mobile layouts.
- Use `.em_pxy*` only when the block’s desktop/mobile padding matches the reference behavior; do not apply randomly.
- Use `.em_h20` or `.em_h30` for vertical spacer cells instead of margins.
- Use existing approved font helper classes for mobile scaling; never invent a responsive font class.
- Use approved image/icon sizing classes from the inventory; never create custom image classes.
- If a class exists in CSS but not in a copied module, keep it in the master CSS only if another selected module needs it; otherwise generated project HTML can remove unused CSS after QA.

## Responsive Breakpoints

- Primary mobile breakpoint: `max-width:599px`.
- Secondary mobile breakpoint: `max-width:480px`.
- Small-device breakpoint: `max-width:374px`.
- Additional campaign-specific mobile helpers may exist in `css2.txt`, but they still follow the same three breakpoint tiers.
- Common mobile behavior:
    - `.em_main_table`, `.em_wrapper` become `width:100% !important`.
    - `.em_hide` is hidden.
    - `.em_full_img img` becomes `width:100% !important; height:auto !important`.
    - `.em_clear` stacks columns by becoming `display:block`, `clear:both`, `width:100%`.
    - `.stack-2` and `.stack-3` are used for mobile stacking.
    - `.em_hide_desktop` reveals desktop-hidden content on mobile.

## CSS Reference Usage Hierarchy

- Primary structural source is `Enphase_Main_Reference.html`.
- `css1.txt` is effectively the extracted core utility/responsive CSS from the main reference and can be reused when a project needs the approved baseline utility set.
- `css2.txt` adds approved font-face declarations and additional campaign helper classes for specific hero/background/CTA/image behaviors.
- When building new project files:
    - first reuse HTML structure and existing classes from `Enphase_Main_Reference.html`
    - then reuse matching utility classes from `css1.txt`
    - then use helper classes from `css2.txt` only when the needed behavior already exists there
- Do not create new CSS behavior or helpers. Only CSS already present in `references/Enphase_Main_Reference.html`, `references/css1.txt`, and `references/css2.txt` is approved.
- If none of the approved sources contains the needed class or behavior, report the gap to the user for human review rather than inventing CSS or modifying this config.

## Typography Standards

- Primary font stack in modules:
    - `'enphase-visuelt-regular', Arial, sans-serif`
- Fallback font stack:
    - `Arial, sans-serif`
- Common body copy sizes:
    - `20px/25px`, `20px/26px`, `20px/30px`, `20px/32px`
    - `18px/25px`, `18px/31px`, `18px/32px`
    - `16px/20px`, `16px/24px`, `16px/25px`
- Common heading/large text classes include:
    - `.em_font22`, `.em_font30`, `.em_font33`, `.em_font50`, `.em_font80`
    - `.em_font_24`, `.em_font_32`, `.em_font_42`, `.em_font_50`, `.em_font_68`, `.em_font_72`, `.em_font_110`, `.em_font_150`
- Use inline styles for final production text formatting because email clients may strip or override CSS.
- Use HTML entities for special characters:
    - `&rsquo;`, `&mdash;`, `&ndash;`, `&bull;`, `&nbsp;`, accented characters where needed.
- For Enphase black-background body sections, use white live text with the proven `18px` font size and `28px` line-height pattern unless the campaign reference specifies otherwise.
- For this body-copy pattern, pair desktop inline `font-size:18px; line-height:28px;` with the mobile helper `.em_font_16`.
- Do not use compact `13px/18px` body typography for regular Enphase campaign body copy unless the provided creative/reference explicitly uses compact letter-size text.

## Detailed Typography System

- Enphase modules mostly define font styles directly on each `td`, not only through classes.
- Standard text declaration pattern:
    - `font-family: 'enphase-visuelt-regular', Arial, sans-serif;`
    - `font-size: [size]px;`
    - `line-height: [line-height]px;`
    - `font-weight: [400/500/700];`
    - `color: #[hex];`
- Font weights observed:
    - `400` for normal body copy.
    - `500` for CTA text and medium emphasis.
    - `700` for headings, bold inline emphasis, card titles, and CTA labels wrapped in `b`.
- Body copy patterns:
    - Large body: `20px` font with `25px`, `26px`, `30px`, or `32px` line-height.
    - Standard body: `18px` font with `25px`, `28px`, `31px`, or `32px` line-height.
    - Compact body/card copy: `16px` font with `20px`, `24px`, or `25px` line-height.
    - Fine print/disclaimer: `12px` or `14px` font with `18px`, `22px`, or `24px` line-height.
- Headline patterns:
    - Center headline example uses `32px` font, `42px` line-height, `400` weight.
    - Card headings often use `18px` or `20px` font, `22px` to `32px` line-height, `700` weight.
    - Promo/card title examples use `24px` font, `31px` line-height, `700` weight.
- CTA typography:
    - Desktop CTA text commonly uses `16px`, `18px`, or `20px`.
    - CTA weight is usually `500` on the button cell and often `bold` or `700` on the anchor.
    - CTA anchor line-height must match button height for vertical centering, for example `line-height:48px`, `50px`, or `60px`.
- Mobile font behavior:
    - Mobile classes reduce headline/body text gradually at `599px`, `480px`, and `374px`.
    - Examples: `.em_font_42` goes from mobile `30px/36px` to `28px/34px` to `26px/32px`.
    - Examples: `.em_font_16` goes from `18px/22px` to `16px/20px` to `14px/18px`.
- Use `span style="font-weight: 700;"` for inline bold emphasis inside body copy.
- For Enphase semibold inline emphasis, prefer `span style="font-family:'enphase-visuelt-semibold', Arial, sans-serif; font-weight:700;"` so bold text follows the brand font instead of relying on default `<strong>` rendering.
- Use `white-space: nowrap;` on phone numbers or short fragments that should not break awkwardly.
- Use `<br>` for intentional line breaks in email copy; avoid relying on paragraph margins.
- Aggressively avoid `letter-spacing` in inline `td` typography styles for Enphase templates.
- Treat no-`letter-spacing` as the strict default rule unless a tested, approved Enphase reference explicitly proves it is required.
- Do not add `letter-spacing` casually for eyebrow text, labels, headings, or CTA-adjacent copy.
- Aggressively avoid `text-transform` in inline `td` typography styles for Enphase templates.
- Treat no-`text-transform` as the strict default rule for Enphase email builds.
- If text must appear uppercase, write the final copy in uppercase directly instead of using CSS `text-transform:uppercase`.
- If preview/client rendering differs, do not try cosmetic typography experiments first; return to the no-`letter-spacing` and no-`text-transform` baseline unless the approved reference clearly requires an exception.

## Spacing Utility Classes

- Side padding helpers:
    - `.em_aside10`, `.em_aside15`, `.em_aside30`, `.em_aside45`
    - `.em_side10`, `.em_side15`, `.em_side60`
- Top/bottom spacing helpers:
    - `.em_ptop`, `.em_ptop1`, `.em_ptop2`, `.em_ptop30`, `.em_ptop40`
    - `.em_pbottom`, `.em_pbottom10`, `.em_pbottom30`, `.em_pbottom40`
    - `.em_h20`, `.em_h30`
- Content padding helpers:
    - `.em_pxy1` through `.em_pxy8`
    - `.mobile-padding`
- When creating new modules, use inline desktop padding and mobile override classes from the reference.

## Detailed Padding and Spacing Rules

- Outer module horizontal padding is usually applied on the first child `td` inside a full-width module table.
- Common desktop side padding:
    - `padding:30px 50px 30px 50px;` for hero/headline sections.
    - `padding:40px 40px 40px 40px;` for standard body/card sections.
    - `padding:0px 40px 40px 40px;` for follow-up sections after a previous block.
    - `padding:0px 50px 40px 50px;` for centered CTA blocks.
    - `padding:0px 30px 20px 30px;` for CTA groups or narrower content rows.
- Card internal padding:
    - Large cream card inner padding is commonly `40px 40px 40px`.
    - Compact card inner padding is commonly `32px`, `32px 32px`, or `32px 40px`.
    - Mobile overrides often reduce card padding to `20px 15px`, `25px 25px`, or `30px 15px` via `.em_pxy*` classes.
- Section vertical rhythm:
    - Standard section bottom spacing is `40px`.
    - Small internal list gaps use `10px`, `15px`, or `20px` bottom padding.
    - Spacer rows use empty `td` cells with explicit `height`, for example `height:24px`, `30px`, or `40px`.
    - Spacer cells should include `font-size:0px; line-height:0px;` or `font-size:0px; line-height:0px; height:[value]px;`.
- Icon list spacing:
    - Icon column width is usually `50px` or `60px`.
    - Icon right padding is usually `10px` or `15px`.
    - Icon sizes observed: `35px`, `40px`, `50px`, `80px`, `90px`, `120px` depending on module.
- Bullet/numbered list spacing:
    - Bullet cell width commonly `10px`.
    - Bullet right padding commonly `10px`.
    - List row bottom padding commonly `10px` or `15px`.
    - Use separate table rows for each bullet/number instead of actual `ul`/`ol` for email compatibility.
- Two-column spacing:
    - Desktop gap between columns/CTAs often uses spacer `td` of `15px`, `20px`, `30px`, or `32px`.
    - On mobile, spacer cells should use `.em_clear`, `.em_h20`, `.em_hide`, or stack-specific classes.
- Mobile padding conventions:
    - `.em_aside15` reduces side padding to `15px`.
    - `.em_aside30` uses `30px` side padding on mobile where CTA/text needs more breathing room.
    - `.em_pxy1` to `.em_pxy8` are campaign-specific mobile padding helpers; reuse only if their values match the new block requirement.
- Rule of thumb:
    - Desktop container width is `600px`.
    - Content area with `40px` side padding gives `520px` usable width.
    - Content area with `50px` side padding gives `500px` usable width.
    - Full-width image modules can use `560px` image width when inside `20px` side spacing, or `600px` for full-bleed hero images.
- For normal paragraph and bullet-list rhythm, prefer padding on content `td` elements instead of repeated spacer-only height rows.
- Use padding examples such as `padding-top:20px`, `padding-bottom:20px`, `padding-top:30px`, and wrapper padding like `padding:30px 40px 0px 40px` to control body-copy spacing.
- Reserve spacer-only height rows for true spacer utilities, image shims, buttons, or forced email-client-specific spacing, not for every paragraph gap.

## CTA/Button Patterns

- Primary CTA style:
    - Black or dark gray background.
    - White text.
    - Rounded pill style using `border-radius:56px`.
    - Height commonly `48px`, `50px`, or `60px`.
    - Anchor is `display:block` with matching `line-height`.
- Secondary CTA style:
    - White or card-background fill.
    - Black border, usually `1px` or `2px solid #000000`.
    - Black text.
    - Same rounded pill styling.
- Mobile CTA classes:
    - `.em_cta`, `.em_cta1`
    - `.em_width_cta_new`, `.em_width_cta_new160`, `.em_width_cta_new1`
    - `.em_font_cta_new`, `.em_font_cta_new1`, `.em_font_cta_new2`
- For Outlook-safe rounded buttons, use the enforced Enphase CTA pattern with MSO `v:roundrect` plus non-MSO HTML inside the same CTA block.
- CTAs must include tracking/metadata where applicable:
    - `alias`
    - `conversion`
    - `data-linkto`
    - `title`
    - `target="_blank"` for web links.

## Detailed Anchor and CTA Coding Rules

- General anchor style pattern:
    - `style="color:[#hex]; text-decoration:none; display:block; line-height:[height]px; font-weight:bold;"`
- Text-link style pattern inside body copy:
    - Wrap in a `span` when needed to force color and underline.
    - Anchor should repeat color and decoration inline, for example `style="color:#000000;text-decoration:underline;"`.
- CTA table structure pattern:
    - Outer alignment table.
    - Inner fixed-width table with `border-radius:56px` and explicit `width`.
    - Button `td` has `bgcolor`, `height`, `border-radius`, `font-family`, `font-size`, `font-weight`, and background color inline.
    - Anchor inside button `td` is `display:block` and carries the clickable URL/tracking metadata.
- Filled CTA example logic:
    - `td bgcolor="#000000"` or `#3C3C3C`.
    - Anchor color `#ffffff`.
    - Button height `48px`, `50px`, or `60px`.
- Outline CTA example logic:
    - Outer button table or `td` uses `border:1px solid #000000` or `border:2px solid #000000`.
    - Fill/background is usually `#ffffff` or same as card background `#FAF6EF`.
    - Anchor color `#000000`.
- Important SFMC preview/rendering lesson for outline CTAs:
    - never rely on a nested `table` alone for the visible outline CTA border if stable SFMC preview rendering matters
    - aggressively prefer the proven Enphase pattern: put the visible border and border-radius on the wrapper `td`
    - the wrapper `td` should be treated as the default required pattern for outline CTA borders unless a tested production reference proves another structure works
    - use `border:[size] solid [color]; border-radius:56px; display:inline-block;` on that wrapper `td`
    - then place a full-width inner table inside the wrapper `td`, with the text/button `td` inside it
    - keep the anchor as `display:block` with matching line-height for the click area
    - if a CTA needs both border and rounded corners, default to the wrapper-`td` border pattern first, not the table-border pattern
    - if preview or client rendering differs, do not experiment loosely; return to the wrapper-`td` border pattern as the enforced fallback standard
- CTA width examples:
    - Small CTA: `160px` to `180px`.
    - Standard CTA: `200px` to `225px`.
    - Long CTA: `250px` to `270px`.
    - Use mobile width helper classes for stacked CTA layouts.
- `alias` should describe the visible action text, for example `Call Now`, `Request a Callback`, `Buy Now`, `Learn more`.
- `title` should usually match the visible CTA label.
- `conversion="true"` should be used for primary conversion actions; `conversion="false"` for secondary/supporting links unless campaign tracking says otherwise.
- `data-linkto` values observed:
    - `https://` for web URLs.
    - `http://` for some web URLs.
    - `other` for `tel:` or `mailto:` links.
- For phone CTAs:
    - Use `href="tel:+[countrycode][number]"`.
    - Do not add `target="_blank"` unless specifically required; phone links can work without it.
- For Outlook rounded CTAs:
    - Aggressively treat the dual CTA structure as the default Enphase production standard:
        - MSO conditional `v:roundrect` for Outlook
        - non-MSO HTML CTA for all other clients
    - Do not assume rounded HTML/CSS CTA styling alone is enough for Outlook when the CTA is reusable, client-facing, or conversion-critical.
    - Do not leave Outlook CTA handling as a later enhancement for production CTA modules.
    - Keep the Outlook VML version and the non-MSO HTML version together inside the same CTA block snippet whenever possible.
    - VML/MSO support can and should live directly inside reusable CTA block HTML; it does not need to depend on the main email template.
    - Use conditional MSO `v:roundrect` with the same destination URL as the normal HTML anchor.
    - Match VML `height`, `width`, `arcsize`, `fillcolor`, `strokecolor`, and visible text with the non-MSO CTA.
    - Include `<w:anchorlock/>` inside the VML button structure.
    - For filled CTAs:
        - use VML `fillcolor` matching the button background
        - use matching `strokecolor` unless the approved creative/reference proves another combination
    - For outline CTAs:
        - use VML `fillcolor` matching the section background
        - use VML `strokecolor` matching the visible outline color
    - For the non-MSO HTML version of outline CTAs, aggressively keep using the proven wrapper-`td` border pattern:
        - wrapper `td` carries the visible `border` and `border-radius`
        - inner table carries content structure
        - anchor remains `display:block`
    - If a CTA block is expected to be reused across projects, strongly prefer shipping it with its VML/MSO Outlook version already included.
    - If preview or Outlook rendering differs, return to this enforced dual-structure pattern first instead of experimenting with alternate CTA markup.

## SFMC and Personalization Patterns

- AMPScript variable output pattern:
    - `%%=v(@Homeowner)=%%`
    - `%%=v(@utm_campaign)=%%`
    - `%%=v(@callCTA_no)=%%`
- AMPScript countdown/timer blocks should calculate remaining time at send/render time with supported `DateDiff()` units only. SFMC AMPScript accepts `y`, `m`, `d`, `h`, and `mi`; it does not accept seconds (`"S"`). Use `DateDiff(Now(), @targetCountdownDate, "mi")`, normalize expired/negative values to `0`, then derive days/hours/minutes using `Mod()` for remainders plus `Divide()`, `Subtract()`, and `Multiply()` for integer portions before outputting values with `%%=v(@variable)=%%`. AMPScript-only countdown values are static after email render and are production-safe as fixed live text; do not use CSS animation for production countdown seconds because support is inconsistent across email clients. For true live ticking seconds across production email clients, use a specialized image/GIF/service-based countdown timer. Do not use unsupported math helpers such as `Floor()` in SFMC AMPScript.
- For animated GIF countdown timers, Outlook desktop and some clients may only show the first frame; make sure the first frame is an acceptable fallback state and save/export a first-frame fallback image with the project assets for QA/reference. Code GIF timers as normal email images with explicit `width`, `height`, `display:block`, `max-width:100%`, meaningful `alt`, and a visible background color behind the image.
- For reusable SFMC timer blocks, support both a pre-defined AMPScript variable such as `@targetCountdownDate` and a sendable DE/profile field such as `TargetCountdownDate`, then include a clearly marked fallback placeholder date that must be updated before production.
- Redirect pattern:
    - `%%=RedirectTo(@FormURL)=%%`
    - `%%=RedirectTo(@formURL)=%%`
- Profile/substitution examples:
    - `%%address1%%`
    - `%%site id%%`
- UTM pattern:
    - Append `?utm_campaign=%%=v(@utm_campaign)=%%` to campaign URLs.
- Before production, confirm variable names are consistent by campaign because the reference uses both `@FormURL` and `@formURL`.

## Detailed URL, UTM, and SFMC Tracking Rules

- Standard UTM append pattern:
    - If URL has no query string, append `?utm_campaign=%%=v(@utm_campaign)=%%`.
    - Example: `https://example.com/page?utm_campaign=%%=v(@utm_campaign)=%%`
- If URL already has query parameters, append with `&utm_campaign=%%=v(@utm_campaign)=%%`, not another `?`.
    - Example: `https://example.com/page?utm_source=enphase&utm_medium=email&utm_campaign=%%=v(@utm_campaign)=%%`
- Never create two question marks in one URL.
- Never duplicate `utm_campaign` in the same URL.
- If a third-party URL already includes fixed UTM values, check whether campaign-specific SFMC UTM should replace or extend it.
- Use `%%=RedirectTo(@formURL)=%%` or `%%=RedirectTo(@FormURL)=%%` when the destination is dynamically built in AMPScript.
- Use direct URLs when the destination is static and campaign-level tracking only needs appended UTM.
- Recommended SFMC CTA anchor attributes for web links:
    - `alias="[Human-readable CTA name]"`
    - `conversion="true|false"`
    - `data-linkto="https://"` or `data-linkto="other"`
    - `href="[URL or RedirectTo()]"`
    - `target="_blank"`
    - `title="[CTA name]"`
- Recommended SFMC CTA anchor attributes for phone links:
    - `alias="Call"` or `alias="Call Now"`
    - `conversion="true|false"`
    - `data-linkto="other"`
    - `href="tel:+[number]"`
    - `title="Call Now"`
- Variable casing rule:
    - SFMC variables are case-sensitive in many workflows; standardize variable names at project setup.
    - Pick one of `@FormURL` or `@formURL` and use it consistently in that project.
- Personalization greeting pattern:
    - `Hi %%=v(@Homeowner)=%%,`
    - Confirm fallback handling is added in campaign AMPScript if values can be blank.
- Profile attributes/substitution strings like `%%address1%%` and `%%site id%%` must match Data Extension field names exactly.
- Use URL encoding for special characters in query values if dynamic values are inserted into URLs.
- QA every link in SFMC Preview/Test Send because `RedirectTo()` and tracked links can render differently after send-time wrapping.

## Brand Visual Patterns

- Main background: `#ffffff`.
- Cream/off-white card background: `#FAF6EF`.
- Light gray section background: `#f8f8f8`.
- Black text and CTA: `#000000`.
- Dark gray CTA: `#3C3C3C`.
- Secondary gray copy: `#7D7D7D`.
- Orange CTA/accent used in one block: `#E96F1A`.
- Card border gray: `#E5E7EB`.
- Warning/disclaimer colors:
    - background `#fffbeb`
    - border `#d97707`
    - text `#92400e`
- Common rounded card radius: `24px`.
- Common button radius: `56px`.

## Image Standards

- Images are hosted on SFMC image domain:
    - `https://image.email.enphase.com/lib/fe2811727364047d7c1d78/m/1/...`
- Use explicit `width` and `height` attributes where possible.
- Use inline image styles:
    - `display:block`
    - `border:0`
    - `outline:none`
    - `text-decoration:none`
    - `max-width` where needed.
- Use meaningful `alt` and `title` attributes for content images.
- Decorative icons may have empty alt/title, but meaningful icons should describe content.
- For mobile background-swap helpers from `css2.txt` such as `.em_bg_mob01`, `.em_bg_mob02`, and `.em_bg_mob03`, treat them as optional enhancements only; critical message content must still remain available as live HTML and not depend solely on the swapped background image.

## Link Standards

- Use inline link color/text-decoration because email clients vary.
- For Enphase body-copy text links, keep link color as `#000000` with underline unless the creative/reference explicitly asks for another brand/accent color.
- For body-copy links on black Enphase body sections, use orange `#E96F1A` with underline for contrast and brand consistency.
- For phone links, use `href="tel:+..."`.
- For tracked SFMC links, maintain `alias`, `conversion`, and `data-linkto` attributes.
- Use `RedirectTo()` for SFMC dynamic links where required.
- Avoid double query strings in URLs; check URLs before production.

## Reusable Content Block Types Observed

- Intro headline block with centered large text.
- Body copy block with personalization greeting.
- Single centered CTA block.
- Highlight card block with cream background `#FAF6EF` and rounded `24px` corners.
- Icon + text list card using fixed icon column and flexible text column.
- Plain icon/text list without card background.
- Bullet list using table rows and `&bull;` in a fixed-width bullet cell.
- Numbered list using table rows and fixed-width number cell.
- Two side-by-side CTA block that stacks on mobile with `.em_clear`.
- Two-column comparison/pricing card using `th` columns that stack on mobile.
- Disclaimer/warning box with colored background and border.
- Image hero/full-width image block using `.em_full_img`.
- Closing/signature text block.
- Loyalty/exclusive offer card.
- Campaign-specific promotional card with image/icon, text, and dual CTA.
- Black Enphase body module with hero/image, white `18px/28px` live text, orange underlined links, table-based bullet rows, and padding-based closing/signature copy.
- Mobile background-image hero pattern using approved helper classes from `css2.txt` for device-specific swaps.
- Height-controlled hero/banner pattern using approved helper classes like `.em_bgh_1`, `.em_hb01`, `.em_hb02`, and `.bg_img_fix`.

## Main Reference Block Inventory

- `Block 1`: headline-only text block; white background; outer `30px 50px`; centered `32px/42px` text; uses `.em_aside15` and `.em_font22`.
- `Block 2`: intro/body copy block; white background; outer `40px`; left aligned `20px/26px` copy; supports personalization like `%%=v(@Homeowner)=%%`.
- `Block 3`: single primary CTA block; centered black pill CTA; `60px` height; uses `.em_cta` and `utm_campaign` on form URL.
- `Block 4`: cream rounded card with three icon + text rows; card `#FAF6EF`; radius `24px`; inner `40px`; icons `50px`; text `20px/25px`; uses `.em_pxy3` and `.em_fnt20`.
- `Block 5`: two CTA layout with MSO/VML button support; first filled CTA and second outline CTA; includes stacked mobile CTA cells with `.em_clear`, `.em_aside30`, `.em_wrapper`, `.em_hide`, and `.em_font_cta_new`.
- `Block 6`: white icon + text list; same three-row icon structure as Block 4 but without cream card fill; icon `40px`; text `16px/20px`.
- `Block 7`: simple text + bullet list + closing sentence; table bullets using fixed `10px` bullet cell; body `20px/30px`.
- `Block 8`: two CTA row; filled black CTA + outline CTA; `180px` widths; stacks using `.em_clear` and `.em_ptop`.
- `Block 9`: orange single CTA; uses `#E96F1A`; width `230px`; `.em_width_cta_new` and `.em_font_cta_new`; SFMC `RedirectTo(@formURL)`.
- `Block 10`: cream promotional alert card; outer `40px 40px 0`; inner card `#FAF6EF`, radius `24px`; copy `20px/26px`.
- `Block 11`: closing/signature text block; outer `0px 40px 40px`; copy `20px/32px`.
- `Block 12`: two CTA row with `Call` and `Request a Call`; filled black and outline black; uses `.em_clear` stacking.
- `Block 13`: two-column pricing/comparison cards; uses `th` columns; `250px + 20px + 250px`; border `#E5E7EB`; `.em_clear` and `.em_h20` for mobile stacking.
- `Block 14`: warning/disclaimer box; background `#fffbeb`; border `#d97707`; text `#92400e`; title `18px/22px`; body `14px/22px` and `14px/24px`.
- `Block 15`: cream `WHAT HAPPENS NEXT` card; inner `32px`; body `16px/24px`; black pill CTA `50px` high.
- `Block 16`: two side-by-side benefit cards on light gray background `#f8f8f8`; each `300px` column; bullet lists; uses `.em_wrapper`, `.em_clear`, `.em_side15`, `.em_ptop`, `.em_fnt20`.
- `Block 17`: cream CTA card; title `24px/31px`; body `20px/31px`; two CTA row; uses `.em_pxy5`, `.em_pxy3`, `.em_width_cta_new`, `.em_font_cta_new`, `.em_clear`, `.em_h20`.
- `Block 18`: centered cream advocacy/partner card; centered text `18px/31px`; inline underlined link; black CTA `50px` high.
- `Block 19`: icon + text + two CTA card; top icon `120px`; body `16px/25px`; text link plus phone link; two CTA row; uses `.em_round_icon_size`, `.em_h20`, `.em_width_cta_new`, `.em_font_cta_new`, `.em_side15`.
- `Block 20`: icon list with four rows; icons `30px` or `35px`; text `18px/25px`; uses fixed icon cells and `data-assetid` placeholders.
- `Block 21`: long body copy block; outer `.em_pxy8`; copy `18px/32px`; includes inline underlined link.
- `Block 22`: centered cream loyalty/exclusive card; label and subcopy `18px/28px`; uses `.em_aside15`, `.em_ptop30`, `.em_pxy2`.
- `Block 23`: bullet recap list; heading `20px/32px`; table bullets `20px/30px`; uses `.em_fnt20` and bold spans.
- `Block 24`: padded image block with `560px` image; uses `.em_full_img`, `.em_aside15`, `.em_pbottom`; has known invalid table nesting to fix before reuse.
- `Block 25`: SFMC styling block wrapper + cream card with icon, body copy, two CTAs; includes `.stylingblock-content-wrapper` and `.camarker-inner`; useful when exporting/importing SFMC content blocks.
- `Block 26`: numbered `How it works` list; intro `20px/25px`; three numbered rows `20px/30px`.
- `Block 27`: two black CTAs in one row; uses `.em_cta` and a corrected spacer `style` attribute.
- `Block 28`: service/support body copy with substitution strings `%%address1%%` and `%%site id%%`; copy `20px/32px`.
- `Block 29`: cream card with numbered list and two CTAs; copy/list `20px/32px` and `20px/30px`; uses `.em_pxy3`, `.em_clear`, `.em_h20`, `.em_font_cta_new`.
- `Block 30`: full-width hero/image block; image `600px`; uses `.em_full_img`.
- `Block 31`: bullet list under image; four table bullet rows; body `20px/30px`; closing sentence with top padding.
- `Block 32`: placeholder block marker only; do not use until populated.

## Required HTML Structure From Main Reference

- Base document shell:
    - XHTML Transitional doctype.
    - `<html>` with XHTML, VML, and Office namespaces.
    - MSO XML Office settings in `<head>`.
    - `<style>` block containing the main reference CSS and breakpoints.
    - `<body class="em_body" bgcolor="#ffffff" style="margin:0px auto; padding:0px;">`.
- Master table shell:
    - Outer full-width table: `width="100%"`, `class="em_full_wrap"`, `bgcolor="#ffffff"`, `style="table-layout:fixed;"`.
    - Centered inner table: `align="center"`, `width="600"`, `class="em_main_table"`, `style="width:600px; table-layout:fixed;"`.
    - All selected modules live inside the main content `td` of this inner table.
- Standard module shell:
    - `table align="center" border="0" cellpadding="0" cellspacing="0" width="100%"`.
    - Wrapper `tr > td` with `align`, `class`, desktop inline `padding`, and `valign="top"`.
    - Inner `table border="0" cellpadding="0" cellspacing="0" width="100%"`.
    - Text/image/CTA content inside nested table rows.
- Card shell:
    - Outer padded `td`.
    - Inner table with `bgcolor="#FAF6EF"`, `style="border-radius:24px;"`, `width="100%"`.
    - Inner padded `td` using `.em_pxy*` class and desktop `padding`.
- CTA shell:
    - Center/left aligned wrapper table.
    - Fixed-width pill table or direct button `td`.
    - `td` with `bgcolor`, `height`, `border-radius:56px`, inline font styles.
    - Anchor with `alias`, `conversion`, `data-linkto`, `href`, inline `color`, `text-decoration:none`, `display:block`, matching `line-height`, and `title`.
- List shell:
    - Never use `ul`/`ol` for production modules.
    - Each item is its own table row.
    - Bullet/number cell is fixed width `10px` to `35px` depending on list/icon type.
    - Text cell carries `.em_defaultlink` and inline font styles.
    - For black body modules with standard Enphase body copy, build each bullet as one padded wrapper row containing a nested two-cell table.
    - In that pattern, use a `14px` bullet cell and match both bullet and copy cells to `18px/28px` typography.
- Two-column shell:
    - Use fixed widths calculated inside available content width.
    - Use `th` or `td` cells with `.em_clear` for mobile stacking.
    - Add spacer cell between columns; hide or stack it on mobile with reference classes.
- Image shell:
    - Wrapper `td class="em_full_img"` for responsive images.
    - Image must include `width`, inline `display:block`, `max-width`, and alt text.

## Module Anatomy and Build Pattern

- Each reusable block generally follows this structure:
    - Full-width module table: `table align="center" border="0" cellpadding="0" cellspacing="0" width="100%"`.
    - One wrapper row and cell: `tr > td` with alignment, padding, class, and `valign="top"`.
    - Inner content table: `table border="0" cellpadding="0" cellspacing="0" width="100%"`.
    - Content rows inside nested tables.
- When a project needs modular block delivery, provide the HTML as clearly separated table blocks, not as one unreadable continuous section.
- Every major block should be wrapped with clear HTML comments before and after the block.
- Recommended comment pattern:
    - `<!-- Block: Header -->`
    - `<!-- End Block: Header -->`
    - `<!-- Block: Hero -->`
    - `<!-- End Block: Hero -->`
    - `<!-- Block: Intro Copy -->`
    - `<!-- End Block: Intro Copy -->`
- If a block contains multiple important internal tables, add comments for those table groups too so future editing is easier.
- Recommended nested table comment pattern:
    - `<!-- Hero Outer Table -->`
    - `<!-- Hero Content Table -->`
    - `<!-- Hero CTA Table -->`
    - `<!-- Feature Card Table -->`
    - `<!-- Two CTA Table -->`
- Comment names should describe function, not only appearance, so another developer or campaign manager can identify the table quickly.
- For generated project HTML, comments should help identify:
    - section purpose
    - major wrapper table
    - content table
    - CTA table when present
    - list/card table when present
- The main email structure should not be treated as a single finished campaign; it is a library of reusable modules.
- Keep block comments like `<!-- Block 1 -->`, `<!-- Block 2 -->` in project builds while developing; final production can keep helpful comments if SFMC/client workflow allows.
- Recommended module naming in project files:
    - `<!-- Hero Headline Block -->`
    - `<!-- Intro Copy Block -->`
    - `<!-- Primary CTA Block -->`
    - `<!-- Feature List Card Block -->`
    - `<!-- Disclaimer Block -->`
    - `<!-- Footer/Closing Block -->`
- For every module, identify these before coding:
    - Desktop outer padding.
    - Mobile padding class.
    - Background color.
    - Text style system.
    - CTA tracking requirements.
    - Whether the module has an image/icon that needs alt/title.

## Table Markup Precision Rules

- Always use complete valid nesting:
    - `table > tr > td > table > tr > td`
- Do not place a `td` directly inside `table` without a `tr`.
- When handing off code, keep each important table visually separated and labeled with comments so individual blocks can be copied, replaced, or debugged safely.
- For two-column layouts, the reference sometimes uses `th` instead of `td` so columns can stack more reliably in mobile email clients.
- When using `th` as layout cells:
    - Add `align`, `valign`, `width`, and mobile stacking class.
    - Override default bold behavior by setting font styles on inner `td` elements.
- Set `border="0" cellpadding="0" cellspacing="0"` on every layout table.
- Set `role="presentation"` on layout tables where possible for accessibility.
- Keep width both as HTML attribute and inline CSS for important fixed-width tables:
    - `width="600" style="width:600px;"`
    - `width="250" style="width:250px;"`
- For percentage-width modules, use `width="100%"` and avoid relying only on CSS width.
- Use `valign="top"` for content cells unless vertical middle alignment is required.
- Use `align="center"`, `align="left"`, or `align="right"` explicitly because some email clients ignore inherited alignment.

## Block-Level Patterns From the Reference

- Headline-only block:
    - White background.
    - Outer padding around `30px 50px`.
    - Center aligned text.
    - Large font, usually `32px/42px`, weight `400`.
    - Mobile class commonly `.em_font22` and `.em_aside15`.
- Intro/body copy block:
    - Outer padding usually `40px` on desktop.
    - Text aligned left.
    - Body font usually `20px/26px` or `20px/25px`.
    - Personalization can appear at the top with a greeting line.
    - Use `<br><br>` for paragraph separation instead of `p` margins.
- Single CTA block:
    - Centered table containing one button.
    - Outer padding often `0px 50px 40px 50px`.
    - CTA cell height may be `48px`, `50px`, or `60px`.
    - CTA anchor takes full click area with `display:block`.
- Cream card block:
    - Wrapper padding often `40px` or `0px 40px 40px`.
    - Inner card uses `bgcolor="#FAF6EF"` and `style="border-radius:24px;"`.
    - Inner padding often `32px` or `40px`.
    - Use this for promotional highlights, next steps, loyalty messages, and feature groups.
- Icon + text row:
    - Outer row table is `width="100%"`.
    - Icon cell has fixed width, commonly `50`, `60`, or `35`.
    - Text cell uses body copy style and `valign="middle"` if aligned beside icon.
    - Use `padding-bottom` on the wrapper row for spacing between items.
- Bullet list row:
    - Each bullet is a separate `table` row.
    - Bullet character is in its own fixed-width cell.
    - Text is in the next cell.
    - Bullet cell uses same font-size/line-height as text for alignment.
    - If the fixed/reference code spaces bullets with row padding, keep that structure instead of replacing it with spacer-only height rows.
- Numbered list row:
    - Same as bullet list, but number cell contains `1.`, `2.`, `3.`.
    - Keep number cell width consistent across all rows.
- Two CTA row:
    - Use two CTA tables separated by spacer cell.
    - Add `.em_clear` to CTA wrapper cells so they stack on mobile.
    - Add `.em_h20` or `.em_ptop` to create vertical gap after stacking.
- Two-column card/pricing block:
    - Use equal fixed widths like `250px + 20px spacer + 250px` inside a `520px` content area.
    - Use borders for card separation.
    - Use `th` for columns where mobile stacking is needed.
- Full image block:
    - Use `td class="em_full_img"`.
    - Image width often `600px` for full-bleed or `560px` for padded image.
    - Always use `display:block`, explicit width, and descriptive alt text.
- Black body module:
    - Use `bgcolor="#000000"` and inline `background-color:#000000` on the module table.
    - Use `.em_full_img` for the top hero/image when present.
    - Use `40px` desktop side padding for the image and text wrapper cells when the content image is `520px` wide.
    - Use white body copy with `18px/28px`, `.em_font_16`, and inline styles on each text cell.
    - Keep program/body links orange `#E96F1A` and underlined.
    - Keep the closing/signature in the same black module unless the creative explicitly shows a separate section.

## Enphase Copy and Content Conventions

- Tone is direct, clear, and action-oriented.
- Common campaign subjects/content themes in the reference:
    - Battery backup and outage readiness.
    - IQ EV Charger / EVSE campaigns.
    - Enphase Care / service plan messaging.
    - Gateway replacement/support messaging.
    - Solar advocacy/Solar Rights/Solar United Neighbors messaging.
    - Installer/homeowner upgrade and pricing offers.
- CTA labels are short and action-focused:
    - `Apply for Beta Access`
    - `I’m interested`
    - `Call now`
    - `Buy Now`
    - `Learn more`
    - `Confirm My Address`
    - `Request a Call`
    - `Click Here`
    - `Request a Free Consultation`
    - `Join Solar United Neighbors`
    - `Get My Estimate`
    - `Request a Callback`
- Use nonbreaking spaces to prevent awkward breaks in short brand/product phrases when needed:
    - `energy&nbsp;future`
    - `Sales&nbsp;team`
    - `next&nbsp;outage`
- Maintain product capitalization exactly:
    - `Enphase Energy`
    - `Enphase App`
    - `IQ Battery`
    - `IQ EV Charger 2`
    - `IQ Microinverter`
    - `Enphase Care`
    - `Gateway`
- If copying blocks between regions/languages, fully localize all visible copy, alt text, titles, aliases, and phone numbers.

## Accessibility and Alt Text Rules

- Layout tables should use `role="presentation"` wherever practical.
- Content images must have meaningful `alt` text that explains the image or product.
- Decorative icons can use `alt=""`, but only when the adjacent text fully explains the content.
- Do not leave truncated alt text in final files.
- CTA anchor text should be descriptive enough to make sense out of context when possible.
- Avoid multiple CTAs with identical generic labels pointing to different destinations unless `alias` and nearby copy clarify the action.
- Keep text as live HTML whenever possible instead of embedding important copy in images.
- Ensure text color has adequate contrast:
    - Black on white/cream is preferred.
    - White on black/dark gray for primary CTAs.
    - Orange backgrounds need white or black text checked for contrast before final send.

## Outlook, Gmail, and Mobile Compatibility Notes

- Outlook desktop needs table-based layout, fixed widths, and MSO/VML support for rounded CTAs.
- Gmail and iOS may auto-link dates, addresses, and phone numbers; keep data detector reset in CSS.
- Use inline CSS for critical styling because some clients strip head CSS.
- Keep media queries for mobile enhancements, but do not depend on them for core desktop layout.
- Avoid CSS shorthand where email client support is questionable; explicit values are safer.
- Avoid relying on margins for spacing; use table padding and spacer rows.
- Avoid background images for critical content because Outlook support is limited.
- Rounded corners with `border-radius` are fine for modern clients, but Outlook may require VML for buttons.
- Use `bgcolor` plus CSS `background-color` for important background colors.
- Use `height` attributes and inline `height` for button/spacer reliability.

## SFMC Build and Send-Readiness Rules

- Before building a project email, define required AMPScript variables at the top of the SFMC email or content block.
- Common variables from reference:
    - `@Homeowner`
    - `@utm_campaign`
    - `@callCTA_no`
    - `@FormURL` / `@formURL`
- If using `RedirectTo()`, the variable should hold a full valid URL before wrapping.
- For test sends, verify rendered links after SFMC tracking wrap.
- Use SFMC Preview with multiple subscriber rows to check personalization and blank-field behavior.
- Confirm each Data Extension field referenced by substitution string exists exactly as used.
- For phone campaigns, confirm country code and formatting by region.
- For forms, confirm whether destination should use Microsoft Forms, Enphase site, Enphase store, installer page, or SFMC CloudPage.
- Keep campaign UTM values centralized, preferably in AMPScript variable assignment, so all links use the same `@utm_campaign` value.

## Common Mistakes to Prevent in Future Project Builds

- Do not ship unused reference blocks in a project email.
- Do not mix Spanish, Dutch, French, and English copy unless the campaign intentionally requires multilingual content.
- Do not leave placeholder page title, empty aliases, empty titles, or placeholder `href` values.
- Do not leave `data-assetid=""` unless SFMC workflow accepts it; final images should have real asset IDs if required.
- Do not use `target="blank"`; use `target="_blank"`.
- Do not leave malformed attributes like `stylke`.
- Do not duplicate `utm_campaign` or create `?utm_campaign=...?...` patterns.
- Do not assume icons are decorative if they communicate product/function benefits.
- Do not change brand colors casually; use reference color system unless project creative specifies otherwise.
- Do not remove MSO XML or base resets from production emails unless a tested template already includes them.
- Do not build email sections with `div`, flexbox, CSS grid, or external CSS files.
- Do not use margin-based spacing for important layout gaps.
- Do not convert a fixed/reference body module to a different background, font scale, or section structure when a working corrected HTML file is provided.
- Do not use spacer-only height rows for every normal paragraph or bullet gap when the approved code uses padding on content cells.
- Do not rely on default `<strong>` rendering when Enphase semibold brand-font spans are needed.
- Do not add any change logs for generated files in project folders.

## Recommended Project Build Workflow

- Read the project-specific references first.
- Read this `main_config.md` before coding.
- Select only the modules needed from `Enphase_Main_Reference.html`.
- Create project HTML with:
    - Base wrapper/head/reset from main reference.
    - Only required body modules.
    - Project-specific copy/images/links/variables.
    - Clean comments and block labels.
- Check all desktop paddings and mobile classes.
- Check all CTA metadata and UTMs.
- Run manual email QA against the production checklist.

## Fixed Operating Rules for Enphase Builds

- Treat this config and the packaged references as fixed, human-reviewed operating rules.
- Before generating any Enphase HTML, first infer the email type:
    - Announcement.
    - Promotion/offer.
    - Service/support notification.
    - Event/webinar/form signup.
    - Product education.
    - Advocacy/partner campaign.
- Then select modules from the reference that match that intent instead of inventing new structures.
- Prefer reusing proven Enphase table modules over creating new layouts.
- Preserve the base shell from the reference unless a project reference explicitly overrides it.
- Preserve Enphase visual rhythm:
    - `600px` master container.
    - `40px` common desktop side padding.
    - `15px` common mobile side padding.
    - `24px` card radius.
    - `56px` CTA radius.
    - White + cream + black/dark CTA palette.
- When unsure about a design choice, choose the pattern already used most often in the reference.
- When a project includes a corrected/fixed HTML file, treat that file as the highest-priority project reference and compare generated code against it before finalizing.
- Do not optimize for modern web standards at the cost of email-client reliability.
- Always think like an SFMC email developer: personalization, tracking, test sends, client compatibility, and campaign handoff matter as much as HTML appearance.

## Module Selection Heuristics

- If the copy is a short top-level promise, use the headline-only block style.
- If the copy explains a situation or gives context, use the intro/body copy block style.
- If there is one primary action, use a single centered CTA block.
- If there are two user choices, use a two-CTA row with primary filled CTA first and secondary outline CTA second.
- If the content is a benefit list with icons, use the icon + text row pattern.
- If the content is a simple list without icons, use table-based bullet or numbered rows.
- If the message needs emphasis or separation, use the cream card pattern.
- If the content contains pricing, plan comparison, or two options, use the two-column card pattern.
- If there is legal/pricing caveat copy, use a disclaimer/warning box pattern with smaller text.
- If a hero image is central to the campaign, use the full image block; otherwise keep key message as live HTML text.
- If content is region-specific, check language, phone number, currency, date format, and URL domain before finalizing.

## Reusable Class Behavior Memory

- `.em_aside15` is the most common mobile side-padding reducer.
- `.em_aside30` is useful when mobile CTA/text blocks need wider side padding than `15px`.
- `.em_wrapper` makes fixed tables fluid on mobile.
- `.em_main_table` controls the master `600px` container and should remain on the main layout table.
- `.em_full_img` and `.em_full_img img` make images fluid on mobile.
- `.em_clear` is the primary stacking class for side-by-side CTAs/columns.
- `.em_hide` hides desktop-only spacer/content on mobile.
- `.em_h20` and `.em_h30` are spacer-height utilities.
- `.em_defaultlink` should be applied to text cells where nested links should inherit styles.
- `.em_cta` controls mobile CTA height/font/padding behavior.
- `.em_font_cta_new*` classes tune CTA font sizes at smaller breakpoints.
- `.em_width_cta_new*` classes tune CTA widths on mobile.
- `.em_pxy*` classes are module-specific mobile padding helpers; check exact intended padding before reuse.
- `.em_cta_pad`, `.em_cta_LH`, and `.em_cta_LH40` from `css2.txt` are approved CTA helpers for compact/mobile button padding and line-height control.
- `.em_width50` and `.em_width2` are approved percentage width helpers for tightly controlled side-by-side mobile layouts.
- `.bg_img_fix` is the approved helper when a background image needs safer mobile containment behavior.
- `.em_word_stack` is an approved helper for forcing word or phrase stacking on smaller screens when the reference already uses that pattern.
- `.em_bordertop` is an approved helper for adding a top divider on mobile variants where the reference uses it.

## Enphase Coding Heuristics

- Write desktop styles inline first, then use existing media-query classes for mobile overrides.
- Use exact pixel spacing from the reference rather than approximate custom values.
- Do not create new CSS classes or behavior. Use only approved CSS from the three packaged references.
- If approved CSS does not cover a requirement, report the gap to the user rather than inventing or documenting a new helper.
- Use `bgcolor` and inline `background-color` together for important backgrounds.
- Use both HTML `width` attributes and CSS `width` for fixed elements.
- Always provide fallback fonts.
- Always use `border-collapse:collapse` tables and zero cellpadding/cellspacing.
- Keep link styles inline on anchors even when parent cell has `.em_defaultlink`.
- Keep `line-height` explicit on text and anchors.
- For visual spacing, prefer padding on `td` and spacer rows over margins.
- For multi-column layouts, calculate total widths so they fit within the padded content area.
- For a `600px` container with `40px` side padding, available content width is `520px`.
- For a `600px` container with `50px` side padding, available content width is `500px`.
- For two cards in `520px`, use `250px + 20px + 250px`.
- For two CTAs, keep combined width plus spacer under available content width.

## SFMC Personalization Self-Check

- Every dynamic value must have a known source:
    - AMPScript variable.
    - Data Extension field.
    - Profile/subscriber attribute.
    - CloudPage/form-generated URL.
- If a variable appears in copy or URL, ensure it is either defined in the project code or provided by the campaign context.
- If personalization can be blank, create or request fallback logic.
- Do not change AMPScript variable casing during copy/paste.
- Do not mix `@FormURL` and `@formURL` in the same project.
- If using phone personalization, ensure the value is sanitized for `tel:` format.
- If using address/site ID personalization, ensure field names match source Data Extension exactly.
- Always preview at least one record with complete data and one with missing optional fields.

## UTM and Link Decision Tree

- Is the URL dynamic from AMPScript?
    - Yes: use `%%=RedirectTo(@VariableURL)=%%` and confirm the variable includes final UTM logic.
    - No: append UTM directly to static URL.
- Does the static URL already contain `?`?
    - No: append `?utm_campaign=%%=v(@utm_campaign)=%%`.
    - Yes: append `&utm_campaign=%%=v(@utm_campaign)=%%`.
- Does the URL already contain `utm_campaign`?
    - Yes: replace or standardize it; do not duplicate it.
- Is the link a telephone link?
    - Use `tel:+number`, `data-linkto="other"`, and no UTM.
- Is the link a form link?
    - Confirm whether it should be a static form URL, Microsoft Forms URL, CloudPage URL, or AMPScript-built URL.
- Is the CTA a primary conversion?
    - Set `conversion="true"` unless campaign instructions say otherwise.
- Is the link informational/secondary?
    - Use `conversion="false"` unless tracking strategy says otherwise.

## Region and Localization Memory

- Reference file contains mixed examples across regions and languages; never assume mixed language content is intentional.
- Region-sensitive items to validate:
    - Language.
    - Currency symbols and formatting.
    - Phone country code.
    - Date format and deadlines.
    - Legal disclaimers.
    - Product availability.
    - URL destination country/locale.
    - Consent and privacy requirements.
- Spanish examples use HTML entities for accented characters; maintain proper encoding.
- French phone example uses `+33`; US phone examples use `+1`.
- Currency examples include `$` and `€`; never reuse pricing/currency across markets without confirmation.

## Final Delivery Habits

- Before finalizing any project, mentally run this sequence:
    - Is the base shell intact?
    - Are only required modules included?
    - Are all paddings consistent with Enphase patterns?
    - Are all fonts, sizes, weights, and line-heights inline and correct?
    - Are all CTAs styled and tracked correctly?
    - Are all UTMs valid and non-duplicated?
    - Are all images hosted, sized, and described correctly?
    - Are all dynamic variables validated?
    - Does mobile stacking follow reference behavior?
    - Are Outlook-specific needs handled?
- If any answer is uncertain, inspect the reference/config again before writing final output.

## Known Unresolved Reference Caveats

- Some image `alt`/`title` values are empty or truncated; update per final creative.
- Some blocks mix languages/campaigns in the same reference file; treat blocks as reusable snippets, not as one final campaign.
- The reference uses both `@FormURL` and `@formURL`; normalize variable casing per project.
- Some VML button font-family declarations contain malformed quoting; validate Outlook button snippets before production.
- For SFMC preview, some outline CTA borders/radius can fail when styling is applied only on a nested `table`; prefer a bordered wrapper `td` with an inner content table for the stable pattern.
- For Enphase builds, treat wrapper-`td` border plus border-radius as the strict default rule whenever an outline CTA needs stable rounded-border rendering.

## Production QA Checklist

- Confirm all `href` values are final and tracked.
- Confirm all AMPScript variables exist in the send context.
- Confirm `@FormURL` / `@formURL` casing and variable names.
- Confirm all CTAs have correct `alias`, `conversion`, `title`, and `data-linkto` values.
- Confirm all images load from approved SFMC-hosted URLs.
- Confirm all content images have meaningful alt text.
- Validate mobile stacking at `599px`, `480px`, and `374px`.
- Validate Outlook rendering, especially rounded CTAs/VML buttons.
- Validate Gmail/iOS rendering for data detector behavior.
- Check for invalid CSS units and typo attributes.
- Check all table structures use valid `table > tr > td` nesting.
- Remove unused blocks before final project HTML delivery.

## Project Usage Rule

- For each new project, use `references/Enphase_Main_Reference.html` as a block library.
- Copy only needed blocks into the project HTML.
- Keep generated project HTML clean, campaign-specific, and free from unused reference blocks.

## Project Learning: HTML Review

- Key reusable rules across the config: black body modules use white `18px/28px` live text; normal body spacing should be padding-based; bullet rows should follow the fixed nested-table pattern; and black-background body links should use orange `#E96F1A` with underline.

## Mandatory Markup and CSS Safety Rules

- Use valid `table > tr > td` nesting throughout; never place a `td` directly under a `table`.
- In every padding declaration, add `px` to all nonzero lengths and write zero as `0px`.
- Use `target="_blank"` for links that open in a new window.
- Give every CTA anchor meaningful `alias` and `title` values matching its visible CTA label.
- Do not use `letter-spacing` in Enphase markup.
- Use one valid query string per URL and never duplicate `utm_campaign`.
- Never invent CSS behavior or helpers; report any approved-CSS gap to the user for human review.
