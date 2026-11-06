# How to edit your site

1. Open https://YOUR-SITE/admin.html
2. First time only: click Settings and fill in
   - Owner: your GitHub username
   - Repository: the repo name
   - Branch: main
   - Token: a fine-grained personal access token (github.com/settings/personal-access-tokens),
     limited to this one repo, Contents set to Read and write.
   The token stays in your browser only. Never put it in a file.
3. Start at "Sections & menu" on the left. Here you can add a new section (for example Testimonials or Services),
   add a menu link, rename, reorder, hide, or delete sections. "On page" shows or hides a section, "In menu" controls the top navigation.
   Built in sections can be hidden but not deleted.
   Then pick any section on the left and edit. Use + Add for new projects, posts, certifications, and so on.
   Use the arrows to reorder, copy to duplicate, and the x to remove.
   Write **word** to make text bold.
4. Image fields have an Upload button. Photos are shrunk automatically.
5. Preview shows your draft on the real site. Publish saves it to GitHub.
   The live site updates in about a minute.

Your edits are kept as a draft in your browser until you publish.
Download JSON gives you a backup of everything.

Run locally: python -m http.server, then open localhost:8000
Files: content.json is your data. index.html, js/render.js and style.css are the site.

New sections have a heading, intro, text paragraphs, and cards (image, title, text, optional button).
Visitors can switch the 3D effects off with the button at the bottom left. Effects also start off for people who
asked their device to reduce motion, and switch off by themselves on devices that are too slow.
