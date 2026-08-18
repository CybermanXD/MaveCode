# Email Development Agent Configuration

## 1. Authority and workflow

This configuration is the working standard for email builds. Build only from the approved reference files:

- Skeleton source: `references/master_template_Skeleton.html` — document structure, metadata, global CSS, responsive utilities, and placement comments.
- Block source: `references/master_template_with_Blocks.html` — approved header, image, text, CTA, feature-card, and footer implementations.
- CSS source: `references/master.css` — approved reset and mobile utility styles.

Use the skeleton unchanged. Insert complete table blocks only within its labelled Header, Body Block, and Footer comment boundaries. Use `master_template.html` for the active email build.

Before each build or revision, state:

1. the target skeleton location;
2. the matching reference block;
3. the desktop and mobile font-size/line-height pairs;
4. image alt text, dimensions, and mobile behaviour; and
5. the CTA nested-table and Outlook VML plan, if a CTA is included.

## Block library and navigation

Use this block directory to find the applicable rules before inserting or revising a section. Every block must remain inside its matching skeleton comment boundary and must start with a complete parent table.

| Block type                                     | Configuration location                            | Approved reference pattern                           |
| ---------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| Header logo                                    | Header block                                      | `master_template_with_Blocks.html` header section    |
| Banner / hero image wider than 280px           | Full-width banner or hero image                   | `master_template_with_Blocks.html` Body Block 1      |
| Centred logo / intrinsic-width image           | Centred intrinsic-width logo image                | `master_template_with_Blocks.html` header logo table |
| Icon plus text row                             | Fixed-width icon image in an icon/text row        | `master_template_with_Blocks.html` feature-card rows |
| Social-media / compact image at 280px or below | Social-media and other compact standalone images  | `master_template_with_Blocks.html` footer social row |
| Text content                                   | Typography rules and Body blocks                  | `master_template_with_Blocks.html` Body Block 2      |
| Rounded CTA                                    | CTA block — required nested-table and VML pattern | `master_template_with_Blocks.html` Body Block 3      |
| Feature card                                   | Feature-card block                                | `master_template_with_Blocks.html` Body Block 4      |
| Footer and social links                        | Footer block                                      | `master_template_with_Blocks.html` footer section    |

### Block-selection rules

- Select one approved block pattern before coding; do not combine unrelated structures unless the reference demonstrates that combination.
- Use the banner hierarchy only for banner or hero images wider than 280px.
- Use the compact-image/icon structures for images 280px wide or smaller; they are not banner blocks.
- Use the CTA structure only for a button and retain both its HTML and Outlook VML branches.
- Apply the global skeleton, coding, typography, and QA rules to every block in addition to its block-specific requirements.

## 2. Mandatory document skeleton

- Keep the XHTML Transitional doctype and the `v` and `o` Microsoft namespaces.
- Retain the Outlook Office XML configuration, including `o:AllowPNG` and `o:PixelsPerInch` set to `96`.
- Preserve the page title and the `Content-Type`, `X-UA-Compatible`, `viewport`, and `format-detection` meta tags.
- Preserve the complete `<style type="text/css">` area and all reset, client-fix, and responsive rules from `master_template_Skeleton.html`.
- The complete `<style type="text/css">` contents are immutable reference code. Copy the full approved stylesheet from `master_template_Skeleton.html` / `master.css` into every new template without selecting, shortening, rewriting, reformatting, or omitting individual rules.
- Never create a reduced stylesheet containing only classes currently used by a template. A class may be required by a later block or revision, and an undefined utility class silently fails in email clients.
- Do not add, remove, rename, or alter any approved utility definition, media-query breakpoint, selector, declaration, or Outlook/client reset in the reference stylesheet unless explicitly instructed to revise the immutable references.
- Before finalizing, compare the template head stylesheet against the complete reference stylesheet. Verify that every approved utility class is present, including spacing utilities such as `em_pbottom20`, even when it was not used in the original build.
- Before applying any `em_*` class in HTML, confirm its exact definition exists in the template stylesheet at the same reference breakpoint. A class used in markup but absent from the stylesheet is a blocking defect.
- Keep the `<body class="em_body">` and table-based header, body, and footer wrappers intact.
- Use a full-width outer wrapper (`em_full_wrap`) and a centred fixed desktop-width `600` inner table (`em_main_table`), each with the existing fixed-table layout styling.
- Do not use flexbox, CSS grid, external stylesheets, JavaScript, or browser-only layout techniques.

## 3. Global email coding rules

- Build layouts with nested `<table>`, `<tr>`, and `<td>` elements. Keep `border="0"`, `cellspacing="0"`, and `cellpadding="0"` on layout tables.
- Use legacy-safe attributes (`width`, `height`, `align`, `valign`, `bgcolor`) in addition to inline CSS where the approved references use them.
- Apply essential visual styles inline on cells, links, and images because email clients can strip or limit head CSS.
- Preserve `table-layout:fixed` and the Outlook `mso-table-lspace` / `mso-table-rspace` reset rules.
- Use table-cell padding for spacing. Do not rely on CSS margin, `gap`, or positioned layout.
- Do not use `<div>`, `<p>`, or `<strong>` elements in email content blocks. Build structure with tables and cells; write text directly inside its styled `<td>`; use inline `font-weight:700` when bold emphasis is required.
- Do not depend on browser-default semantic-element spacing or formatting. Every text style and every spacing value must be explicitly controlled with inline styles and table-cell padding.

#### Prohibited content markup — bad and approved patterns

**Bad — do not use `<div>`, `<p>`, or `<strong>` in a content block:**

```html
<div class="headline">
	<p>Welcome to <strong>Taskduck</strong></p>
</div>
```

**Approved — use a styled table cell and inline weight instead:**

```html
<table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
	<tr>
		<td
			align="left"
			valign="top"
			style="padding:0px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:21px;font-weight:700;color:#191919;">
			Welcome to Taskduck
		</td>
	</tr>
</table>
```

**Bad — do not create paragraph separation with `<p>` or margin:**

```html
<p style="margin:0 0 20px 0;">First paragraph</p>
<p>Second paragraph</p>
```

**Approved — use separate table rows/cells and cell padding for controlled separation:**

```html
<table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
	<tr>
		<td
			align="left"
			valign="top"
			style="padding:0px 0px 20px 0px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:19px;color:#191919;">
			First paragraph
		</td>
	</tr>
	<tr>
		<td
			align="left"
			valign="top"
			style="padding:0px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:19px;color:#191919;">
			Second paragraph
		</td>
	</tr>
</table>
```

#### Prohibited scripting, embedded content, forms, and unsupported CSS — bad examples

Never use JavaScript, event handlers, embedded browser content, forms, modern browser layout, external CSS loading, CSS custom properties, complex selectors, or generated pseudo-element content. These are unsupported, stripped, or unreliable in email clients. The following are prohibited patterns:

**Bad — script, event handlers, and JavaScript URLs:**

```html
<script>
	alert("Hi")
</script>
<a href="#" onclick="openMenu()">Click</a>
<body onload="init()">
	<a href="javascript:void(0)">Click</a>
</body>
```

**Bad — embedded browser content:**

```html
<iframe src="https://example.com"></iframe>
<embed src="file.pdf" />
<object data="file.pdf"></object>
```

**Bad — HTML forms and inputs:**

```html
<form action="/submit">
	<input type="email" />
	<button>Submit</button>
</form>
```

**Bad — Flexbox, CSS Grid, and CSS `gap`:**

```html
<div style="display:grid;">
	<div>One</div>
	<div>Two</div>
</div>
<div style="display:flex;">
	<div>One</div>
	<div>Two</div>
</div>
<div style="display:flex;gap:20px;">Content</div>
```

**Approved — use nested layout tables and cell padding:**

```html
<table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
	<tr>
		<td width="[first column width]" valign="top" style="padding:0px [desktop gutter]px 0px 0px;">One</td>
		<td width="[second column width]" valign="top" style="padding:0px;">Two</td>
	</tr>
</table>
```

**Bad — positioning, external CSS, CSS variables, complex selectors, and generated content:**

```css
.hero {
	position: absolute;
	top: 20px;
}
.banner {
	position: fixed;
	top: 0;
}
@import url("email.css");
:root {
	--brand: #000;
}
.button {
	color: var(--brand);
}
.container > div:nth-child(2) {
	color: #000;
}
.button::before {
	content: "→";
}
```

**Approved — use inline declarations on the target email-safe element:**

```html
<td
	align="center"
	valign="middle"
	bgcolor="#000000"
	style="padding:20px;background-color:#000000;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:19px;">
	Button label &rarr;
</td>
```

- Do not use `<script>`, `onclick`, `onload`, any other `on*` event attribute, or `javascript:` URLs.
- Do not use `<iframe>`, `<embed>`, `<object>`, `<form>`, `<input>`, `<button>`, or other interactive form controls.
- Do not use `display:flex`, `display:grid`, CSS `gap`, `position:absolute`, `position:fixed`, `@import`, CSS custom properties (`--property` or `var()`), child/structural selectors, or `::before` / `::after` generated content.
- Use final HTTPS URLs in standard anchors; use table structures, fixed table-cell widths, and table-cell padding for layout and spacing; write visual content directly in the HTML rather than creating it through CSS.
- Presence of any prohibited construct is a blocking defect. Scan both HTML and stylesheet code before finalizing.
- Keep mobile classes and the existing media queries. At `599px` and below, the main table becomes fluid; use the supplied utility classes for mobile adjustments.
- When a cell has left and right padding greater than `15px`, add the `em_plr15` class so its horizontal padding becomes `15px` on mobile.
- When a cell has top padding greater than `20px`, add the `em_ptop` class so its top padding becomes `20px` on mobile.
- When a cell has bottom padding greater than `20px`, add the `em_pbottom` class so its bottom padding becomes `20px` on mobile.
- **Mandatory enforcement:** Inspect every `<td>` with an inline `padding:` declaration before finalizing a build. Parse its padding as `top right bottom left`, including CSS shorthand forms with one, two, three, or four values. Apply each required responsive class independently; a cell may require one, two, or all three of `em_plr15`, `em_ptop`, and `em_pbottom`.
- Never assume that a row is exempt because it is an icon row, divider, nested table, feature row, footer row, or CTA wrapper. Padding rules apply to every `<td>` in every block, except an inner CTA button cell whose horizontal padding deliberately creates its intrinsic button width.
- Audit in this order: (1) left/right over 15px → `em_plr15`; (2) top over 20px → `em_ptop`; (3) bottom over 20px → `em_pbottom`; (4) retain any existing non-spacing classes when adding these classes.
- A missing utility class is a blocking defect. Do not mark a template complete until every qualifying `<td>` has been checked against all three padding thresholds.
- Preserve Apple and Gmail auto-link reset rules so detected links inherit the intended appearance.
- Keep content in meaningful source order. Visual order must equal reading order.

## 4. Typography rules

- Declare `font-family`, `font-size`, `line-height`, `color`, `font-weight`, and `text-align` inline on each text content cell.
- Use numerical `font-weight` values only: `300`, `400`, `500`, `600`, `700`, or `800`. Do not use keyword values such as `normal`, `bold`, `lighter`, or `bolder`. Use `400` for regular copy and `700` for standard bold emphasis unless the design specifies another numerical weight.
- **Line height must always be exactly font size + 3px.** Examples: `14px` → `17px`, `16px` → `19px`, `20px` → `23px`, `30px` → `33px`.
- For desktop text that changes on mobile, use the matching provided utility class (for example, `em_font_20`) in addition to the inline desktop declaration.
- Every font size greater than `20px` must include its matching responsive `em_font_*` class already defined in the CSS (for example, 22px uses `em_font_22`, 24px uses `em_font_24`, and 30px uses `em_font_30`).
- **Mandatory font enforcement:** Inspect every inline `font-size` value. Any value greater than `20px` must have the closest matching existing `em_font_*` class. Use an exact matching class where it exists. If a massive display size has no exact approved class, use the nearest available approved large class (`em_font_24`, `em_font_26`, `em_font_28`, `em_font_30`, `em_font_32`, `em_font_36`, or `em_font_38`) rather than adding a custom utility. A missing responsive font class is a blocking defect, including text in headers, feature cards, account data, footer content, and compact nested tables.
- A font class belongs on the same text-bearing `<td>` or `<span>` as the inline desktop `font-size`; do not put it only on an ancestor table. Preserve the inline desktop font size and line height while the class provides the approved mobile value.
- Use `em_defaultlink` for links that inherit the surrounding text style. Use `em_defaultlink1` only when the required inherited link style is underlined.
- Keep headings and body copy inside table cells; do not depend on browser-default heading or paragraph margins.

## 5. Image rules

- Every `<img>` requires an `alt` attribute. Write meaningful alt text for informative images; use `alt=""` only for decorative images.
- Add explicit `width` and, where known or required, `height` attributes.
- Include `display:block` inline to prevent baseline gaps.
- Include fallback styling on images: suitable font family, font size, line height, text colour, `border:0`, and `outline:none`.
- Use `em_full_img` only for responsive images wider than `280px`. Its existing mobile rule makes the nested image `width:100%` and `height:auto`.
- Do not apply `em_full_img` to images that are `280px` wide or smaller, including icons, social-media icons, small logos, badges, and other compact images. These elements must retain their intended explicit dimensions.
- **Mandatory image-width enforcement:** Audit every `<img>` individually before finalizing. Read its explicit `width` attribute; if the value is greater than `280px`, its direct containing image `<td>` must include `class="em_full_img"`. This rule applies to every image role, including hero images, banners, editorial images, product visuals, diagrams, charts, data graphics, and other large content images.
- Never assume that an image is exempt from `em_full_img` because it is a diagram, clinical visual, chart, embedded content graphic, or appears inside a card. The explicit width threshold alone determines whether the class is required.
- `em_full_img` belongs on the image's direct parent `<td>`, never on the `<img>` element, an ancestor table, or an unrelated wrapper. The immutable CSS selector is `.em_full_img img`; incorrect placement prevents responsive image scaling.
- A missing `em_full_img` on any image wider than `280px`, or an `em_full_img` class on an image at or below `280px`, is a blocking defect.
- Required audit sequence: (1) enumerate every `<img>`; (2) verify `alt`, explicit `width`, required `height`, `display:block`, and fallback styling; (3) compare the width to `280px`; (4) verify `em_full_img` on the direct parent `<td>` only when width is greater than `280px`; (5) verify the correct image table hierarchy for the image role.
- Wrap a linked image in an anchor with the final URL, `target="_blank"`, and inline link-reset styling.

### Required image table hierarchy

Every image block starts with a parent table; never place an image directly inside a body-block comment. Select one of the following approved structures according to the image’s role.

**Scope:** The full-width parent-table plus no-width inner-table hierarchy is required only for banner and hero image blocks. It does not apply to compact images such as feature icons, social-media icons, badges, or other images `280px` wide or smaller.

#### A. Full-width banner or hero image

Use this hierarchy: **100%-width parent table → row → centred parent cell → inner centred table with no width → row → responsive image cell → link → image**.

```html
<table
	bgcolor="[section background colour]"
	align="center"
	valign="middle"
	border="0"
	cellspacing="0"
	cellpadding="0"
	width="100%"
	style="background-color:[section background colour];">
	<tr>
		<td align="center" valign="middle">
			<table align="center" valign="middle" border="0" cellspacing="0" cellpadding="0">
				<tbody>
					<tr>
						<td valign="top" align="center" class="em_full_img">
							<a href="[image link]" target="_blank" style="text-decoration:none;color:[link colour];"
								><img
									src="[image source]"
									width="[desktop image width]"
									alt="[meaningful image description]"
									border="0"
									style="max-width:[desktop image width]px;display:block;color:[fallback colour];font-size:[fallback font size]px;line-height:[fallback line height]px;font-family:[fallback font family];"
							/></a>
						</td>
					</tr>
				</tbody>
			</table>
		</td>
	</tr>
</table>
```

- The outer table must have `width="100%"` because it carries the full-width section background across the available 600px email container.
- The nested centred table deliberately has **no `width` attribute**. It wraps to the image’s explicit desktop width and keeps the banner centred inside the full-width background table.
- The image stays at its explicit desktop width inside the nested table. The `em_full_img` cell enables the supplied mobile rule to scale it to 100% width with automatic height.
- This is the approved pattern used by the banner block in `master_template_with_Blocks.html`.

#### B. Centred intrinsic-width logo image

Use this hierarchy: **100%-width background parent table → row → padded centred cell → inner centred table with no width → row → image cell → link → image**.

```html
<table
	bgcolor="[section background colour]"
	align="center"
	valign="middle"
	border="0"
	cellspacing="0"
	cellpadding="0"
	width="100%"
	style="background-color:[section background colour];">
	<tbody>
		<tr>
			<td valign="top" align="center" style="padding:[top]px [right]px [bottom]px [left]px;">
				<table border="0" cellspacing="0" cellpadding="0" align="center">
					<tbody>
						<tr>
							<td valign="top" align="center">
								<a href="[logo link]" target="_blank" style="text-decoration:none;color:[link colour];"
									><img
										src="[logo source]"
										width="[logo width]"
										height="[logo height]"
										alt="[brand name]"
										border="0"
										style="max-width:[logo width]px;display:block;font-size:[fallback font size]px;line-height:[fallback line height]px;color:[fallback colour];font-family:[fallback font family];"
								/></a>
							</td>
						</tr>
					</tbody>
				</table>
			</td>
		</tr>
	</tbody>
</table>
```

- The outer parent table has `width="100%"` to carry the section background across the email width.
- The nested centred table deliberately has **no `width` attribute**. It shrinks to the logo’s explicit image dimensions and prevents the logo wrapper from expanding to the full email width.
- The image is always inside a `<td>`; the link is inside that cell; the image is inside the link.
- This is the approved pattern used by the header logo in `master_template_with_Blocks.html`.

#### C. Fixed-width icon image in an icon/text row

Use this hierarchy: **100%-width row table → row → fixed-width icon cell → image**, followed by a separate text cell.

```html
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
	<tr>
		<td align="left" valign="middle" width="[icon cell width]" style="padding-right:[gap]px;">
			<img
				src="[icon source]"
				width="[icon width]"
				height="[icon height]"
				alt="[icon description]"
				border="0"
				style="display:block;width:[icon width]px;height:[icon height]px;border:0;outline:none;text-decoration:none;" />
		</td>
		<td
			align="left"
			valign="middle"
			class="em_defaultlink"
			style="color:[text colour];font-family:[font family];font-size:[font size]px;line-height:[font size + 3]px;font-weight:[font weight];">
			[text]
		</td>
	</tr>
</table>
```

- The icon cell has an explicit width; do not make the icon itself or its cell fluid.
- Use cell padding for the icon/text gap.
- The icon image still requires alt text, dimensions, and `display:block`.
- Do not use `em_full_img`, the banner parent-table hierarchy, or the widthless banner inner table for icons or social-media icons.

#### D. Social-media and other compact standalone images

- Keep social-media icons and other compact images in their own intrinsic-width table cells, as shown by the footer pattern in `master_template_with_Blocks.html`.
- Preserve the image’s explicit width and any specified height. Do not make these images fluid and do not apply `em_full_img` when the image width is `280px` or smaller.
- Use fixed-width spacer `<td>` elements between social icons; do not add a 100%-width parent/inner image-table structure unless the complete containing footer section independently requires it.
- Every compact image still requires an appropriate alt value, `display:block`, and fallback styling.

## 6. Responsive multi-column and stackable-column blocks

### Identify stackable columns

- Treat each independent repeated content item as a stackable column: image-gallery items, product or service tiles, feature cards, and similar standalone units.
- Do not make an icon-and-copy row stackable merely because it uses two `<td>` elements. Its icon and text are parts of one component and remain horizontal unless the supplied design explicitly requires a mobile stack.
- Keep independent columns in their intended left-to-right reading order in the HTML. Their mobile stack must follow that same top-to-bottom source order.

### Mandatory stackable-column enforcement

- Every independent desktop column that must stack on mobile must have `em_clear` on its outer column `<td>`. Example: `<td width="[desktop width]" class="em_clear" valign="top" style="width:[desktop width]px;">`.
- `em_clear` already applies `clear:both`, `display:block`, and `width:100%` at the mobile breakpoint. Do **not** add `em_wrapper` to the same stackable column; it is redundant.
- Do not place `em_clear` only on an inner table, image, link, or text element. It belongs on the outer `<td>` for the complete independent column.
- A missing `em_clear`, or a redundant `em_wrapper em_clear` pairing, on a required independent stackable column is a blocking defect.
- Use explicit desktop pixel widths for all multi-column `<td>` elements. Supply both the legacy `width="[pixels]"` attribute and matching inline `style="width:[pixels]px;"`.
- Do not use authored percentage widths such as `50%`, `33.33%`, `34%`, or `32%` for desktop columns. `width="100%"` is permitted only for a table that must fill its immediate parent. Existing percentages inside approved responsive CSS utility definitions remain unchanged.
- Use cell padding for desktop column gutters. Apply the right gutter only to non-final columns; the final desktop column has no trailing right gutter.
- When independently stacked columns require vertical separation on mobile, add `em_pbottom20` to columns `1` through `n-1` only. Do not add it to the final column, so there is a 20px gap between mobile modules with no trailing gap after the final module.
- Apply `em_pbottom20` directly on the same outer column `<td>` that has `em_clear`. It operates only in the supplied mobile media query and must not replace the desktop horizontal-gutter padding.

### Fixed-width image gallery hierarchy — required exact structure

For a multi-column block containing fixed-width compact images that must remain centred after mobile stacking, use this exact hierarchy: **100%-width section table → row → padded wrapper cell → centred no-width column-parent table → row → fixed-pixel `em_clear` column cells → images**.

```html
<table
	bgcolor="[section background]"
	align="center"
	border="0"
	cellspacing="0"
	cellpadding="0"
	width="100%"
	style="background-color:[section background];">
	<tr>
		<td class="[required padding utilities]" style="padding:[top]px [right]px [bottom]px [left]px;">
			<table border="0" cellspacing="0" cellpadding="0" role="presentation" align="center">
				<tr>
					<td
						width="[image one column width]"
						class="em_clear"
						valign="top"
						style="width:[image one column width]px;padding-right:[desktop gutter]px;">
						<img
							src="[image source]"
							width="[image width]"
							height="[image height]"
							alt="[meaningful image description]"
							border="0"
							style="display:block;width:[image width]px;height:[image height]px;" />
					</td>
					<td
						width="[image two column width]"
						class="em_clear"
						valign="top"
						style="width:[image two column width]px;">
						<img
							src="[image source]"
							width="[image width]"
							height="[image height]"
							alt="[meaningful image description]"
							border="0"
							style="display:block;width:[image width]px;height:[image height]px;" />
					</td>
				</tr>
			</table>
		</td>
	</tr>
</table>
```

- The first table is the section/background container and **must** use `width="100%"`.
- The second table directly enclosing the fixed-width columns **must have no `width` attribute** and **must include `align="center"`**. It is an intrinsic-width table, not a fluid layout table.
- Never add `width="100%"` to this second fixed-image column-parent table. Doing so is a blocking defect because fixed-width images can align to the left after mobile stacking.
- The no-width centred second table takes the natural combined desktop width of the fixed columns, while `em_clear` changes the child cells into separate mobile rows.
- Compact gallery images at `280px` wide or below retain their explicit width and height and do **not** receive `em_full_img`. Retain `display:block`, meaningful `alt` text, and image fallback styling.

### Fluid card-column exception

- A card grid may use a `width="100%"` parent table and `width="100%"` nested card tables when each card is intentionally designed to fill its own desktop cell and then its expanded mobile column.
- Even in this fluid-card pattern, the outer desktop card cells still require fixed pixel widths plus `em_clear`.
- Do not use the fixed-image no-width parent-table pattern blindly for fluid cards. Select the fixed-image or fluid-card structure according to whether the inner content must remain intrinsically fixed-width or deliberately fill the stacked column.

## 7. Block placement and approved patterns

### Header block

#### Header logo placement and hierarchy

- Add the header only between `<!-- Header table block here starts -->` and `<!-- Header table block here Ends-->`.
- Follow the logo-header structure in `master_template_with_Blocks.html`: background table → padded centred cell → inner centred table → linked logo image.
- Preserve explicit logo dimensions, image alt text, and `display:block`.

### Body blocks

#### Body block placement

- Add every content section as a complete table between its matching `<!-- Body Block n BELOW as table -->` and `<!-- Body Block n BELOW as table ENDS-->` comments.
- Keep blocks sequential; do not place a block outside a labelled body region.
- Banner block: use the approved full-width image-table pattern and `em_full_img`.
- Text block: use a full-width background table with a padded content cell, nested 100%-width table, inline text styling, and an appropriate mobile typography class.
- Feature-card block: use a background table, padded outer cell, nested card table, then one nested icon/text table per row. Reserve icon width in a dedicated cell, add cell padding for the icon/text gap, and give each icon an alt value and dimensions.

#### Banner / hero block

- Use the complete hierarchy and reusable code in **A. Full-width banner or hero image** above.
- Use this block only when the image is wider than 280px and should scale on mobile.

#### Text block

- Begin with a complete 100%-width parent table, then use the padded content-cell and nested 100%-width text-table pattern.
- Keep all text typography inline and verify normal copy uses `line-height = font-size + 3px`.

#### Feature-card block

- Begin with a complete 100%-width background parent table, followed by the padded outer cell and nested card table.
- Build each feature item as its own nested 100%-width icon/text row table. Follow the compact icon requirements in **C. Fixed-width icon image in an icon/text row** above.

### Footer block

#### Footer and social-media block

- Add the footer only between `<!-- Footer Table Block here -->` and `<!-- Footer Table Block here ends -->`.
- Follow the footer/social pattern in `master_template_with_Blocks.html`.
- Use individual table cells for social icons and explicit spacer cells between them. Every social icon must have a platform-specific alt text.

## 8. CTA block — required nested-table and VML pattern

### CTA block placement

- Add the complete CTA parent table only between the paired comments for the selected body block.
- Use no standalone button markup outside the CTA parent table.

For rounded call-to-action buttons, use the following approved reference pattern. Replace every value in square brackets in both the VML and HTML branches. The VML and HTML URL, label, width, height, background colour, typography, and corner treatment must remain synchronized.

### Required CTA table hierarchy and sizing

Use this exact hierarchy: **100%-width outer CTA layout table → row → padded centred outer cell → Outlook VML branch / non-Outlook inner centred table with no width → row → fixed-height button cell → block-level CTA link**.

- The **outer CTA layout table** must use `width="100%"`; it provides the full available block width and contains the CTA’s external spacing.
- The **inner HTML button table** deliberately has **no `width` attribute**. It must shrink to the CTA label plus the button cell’s horizontal padding instead of stretching to full email width.
- The outer CTA cell applies external CTA spacing with inline padding. Follow the approved default pattern: `padding:30px 15px 30px 15px` unless the design supplies different values.
- The button’s width is not set on the inner HTML table or its button cell. Its natural HTML width is created by the CTA label plus the button cell’s horizontal padding (the approved pattern uses `padding:0px 40px`).
- The Outlook VML `v:roundrect` **does** need an explicit width because Outlook cannot reliably calculate the natural width from HTML padding. Set the VML width to the approved measured button width and keep it visually synchronized with the HTML button.
- The button cell needs both `height="[button height]"` and inline `height:[button height]px`.
- Use `bgcolor` and inline `background-color` on the HTML button cell for broad client support. Use inline `border-radius` for non-Outlook clients and VML `arcsize` for Outlook.
- The CTA label is an exception to the normal text line-height rule: its line height must equal the **button height**, not font size + 3px. For example, a 46px-high CTA uses `line-height:46px` in both the VML centre text and the HTML anchor.

```html
<!-- Body Block [n] BELOW as table -->
<!-- This is a CTA block -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" align="center" role="presentation">
	<tr>
		<td align="center" valign="middle" style="padding:[top]px [right]px [bottom]px [left]px;">
			<!--[if mso]>
				<v:roundrect
					xmlns:v="urn:schemas-microsoft-com:vml"
					href="[CTA URL]"
					style="height:[button height]px;v-text-anchor:middle;width:[button width]px;"
					arcsize="[corner radius percentage]"
					stroke="f"
					fillcolor="[button background colour]">
					<w:anchorlock />
					<center
						style="color:[text colour];font-family:[font family];font-size:[font size]px;font-weight:[numeric font weight];line-height:[button height]px;">
						[CTA LABEL]
					</center>
				</v:roundrect>
			<![endif]-->
			<!--[if !mso]><!-->
			<table border="0" cellspacing="0" cellpadding="0" align="center" role="presentation">
				<tr>
					<td
						align="center"
						valign="middle"
						height="[button height]"
						bgcolor="[button background colour]"
						style="height:[button height]px;background-color:[button background colour];border-radius:[radius]px;padding:0px [horizontal padding]px;">
						<a
							href="[CTA URL]"
							target="_blank"
							style="display:block;font-family:[font family];font-size:[font size]px;line-height:[button height]px;color:[text colour];font-weight:[numeric font weight];text-decoration:none;"
							>[CTA LABEL]</a
						>
					</td>
				</tr>
			</table>
			<!--<![endif]-->
		</td>
	</tr>
</table>
<!-- Body Block [n] BELOW as table ENDS-->
```

CTA requirements:

- The CTA must be a complete table block inside the correct paired body-block comments; never place VML or a CTA anchor directly in the body wrapper.
- The outer `width="100%"` table supplies full-width layout; the outer cell supplies external CTA spacing; the inner centred HTML button table has no width and centres the natural-width button.
- Keep `border="0"`, `cellspacing="0"`, `cellpadding="0"`, `align="center"`, and `role="presentation"` on the CTA layout tables, as used by the approved reference.
- Keep the VML block within `<!--[if mso]>` and the standard HTML block within `<!--[if !mso]><!-->`.
- `v:roundrect` is mandatory for a rounded Outlook CTA because Outlook desktop does not reliably render CSS `border-radius`. Include the VML namespace, `href`, explicit `height`, explicit `width`, `v-text-anchor:middle`, `arcsize`, `stroke="f"`, `fillcolor`, `<w:anchorlock/>`, and centred fallback label.
- The VML `href`, button dimensions, background colour, corner radius, label, text colour, font family, font size, and font weight must match the HTML CTA.
- The HTML anchor must be block-level and use `text-decoration:none`. Its line height must equal the button height for vertical centring.
- Do not add vertical padding to the button cell. Keep vertical sizing controlled by its explicit height and matching label line height; use horizontal padding only to create the HTML button width.
- The text line-height +3 rule applies to normal text blocks. Button labels use the button height as their line height to centre the label.

## 9. Quality-assurance checklist

Before finalizing an email, verify all of the following:

- The approved skeleton, metadata, Office configuration, head CSS, wrappers, and labelled comments remain present and unmodified except for approved content insertion.
- The template contains the complete, unchanged reference stylesheet; no reference utility, reset, client fix, media query, or breakpoint was selectively omitted or rewritten.
- Every `em_*` class used in markup has its exact approved definition in the template stylesheet at the required responsive breakpoint.
- Every new section is a complete table block in the correct header, body, or footer comment region.
- All content styling that affects rendering is inline and email-safe.
- No content block contains prohibited `<div>`, `<p>`, or `<strong>` markup; text is in styled table cells and emphasis uses inline `font-weight`.
- No prohibited scripting, event handler, embedded-content, form, Flexbox, Grid, `gap`, positioning, external-import, CSS-variable, complex-selector, or pseudo-element pattern is present.
- All normal text uses `line-height = font-size + 3px`.
- All `font-weight` declarations are numerical; no `bold`, `normal`, `lighter`, or `bolder` keyword is used.
- Every text-bearing `<td>` or `<span>` with an inline font size above `20px` has the closest existing `em_font_*` class, including oversized display text.
- Every image has suitable alt text, explicit dimensions, `display:block`, and fallback styling.
- Hero/banner images use `em_full_img` for responsive scaling.
- Every `<img>` has been individually checked against the `280px` threshold: every image wider than `280px` has `em_full_img` on its direct parent `<td>`, and no image at or below `280px` has that class.
- Every intended stackable independent column has `em_clear`, without redundant `em_wrapper`, on its outer fixed-pixel `<td>`.
- Where a stackable module needs mobile separation, columns `1` through `n-1` have `em_pbottom20` and the final column does not.
- No authored multi-column desktop percentage widths are present except `width="100%"` tables that fill their parent.
- Each fixed-width image gallery uses a `width="100%"` first section table followed by an `align="center"` second column-parent table with no `width` attribute.
- Compact fixed-size gallery images retain explicit dimensions and do not use `em_full_img`.
- Every rounded CTA has equivalent nested HTML-table and Outlook VML versions, with synchronized content and dimensions.
- Links have final destinations, appropriate `target="_blank"` usage, and no accidental default styling.
- Existing desktop and mobile utility classes continue to work; no unsupported layout methods were introduced.
