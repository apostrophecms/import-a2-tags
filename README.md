# `@apostrophecms/import-a2-tags`

## Purpose

While Apostrophe 2 documents have a `tags` array field, this field doesn't exist in
Apostrophe 3. Instead, tags are represented as relationships to a "tag piece type" if
and when this is desired in a particular project.

This module provides a simple way to migrate A2-style, array-based `tags` properties to
A3-style relationships to a "tag piece type" corresponding to a particular piece type, or
to pages.

This module is most often used after a successful run of `@apostrophecms/content-upgrader`,
which copies the `tags` array property of each document over to A3 without modification.

## Installation

```bash
npm install @apostrophecms/import-a2-tags
```

## Configuration

Note that in this example we are configuring tags for all page types, but you can also import
tags for any piece type or individual page type in the same way.

You can also add tags to *all* piece types by configuring them for `@apostrophecms/piece-type`,
but usually this is a mistake because you will want to curate the tags for each piece type
separately.

```javascript
// in app.js
modules: {
  // Create a "tag piece type" to hold the tags in A3, since
  // A3 does not use arrays for tags.
  //
  // For images and files you can skip this
  'page-tag': {},
  // Activate the import-a2-tags module
  '@apostrophecms/import-a2-tags': {}
}

// in modules/page-tag/index.js (for images and files you can skip this)
module.exports = {
  extend: '@apostrophecms/piece-type'
},

// in modules/@apostrophecms/page-type/index.js (for images and files you can skip this)
module.exports = {
  fields: {
    add: {
      _tags: {
        type: 'relationship',
        withType: 'page-tag',
        label: 'Tags',
        help: 'Tags for this page'
      }
    }
  }
};
```

## Usage

```bash
# Import tags on images to the built-in image-tag piece type and create relationships
node app @apostrophecms/import-a2-tags:import --types=@apostrophecms/image:@apostrophecms/image-tag
# Requires additional configuration, see above
node app @apostrophecms/import-a2-tags:import --types=@apostrophecms/page-type:page-tag
```

### Specifying the piece type or page type to import tags from

The type before the `:` is the page or piece type that has data in an existing `tags` array
property in MongoDB (usually due to an import from A2).

### Specifying the "tag piece type" to represent the tags

Since A3 does not have array-based tags, you'll need to add a piece type to your project
to represent the tags. This change was made in A3 because it yields a better curation
experience.

The type after the `:` is a piece type that you have added to your A3 project to serve as a
"tag type." You must also add a `_tags` relationship pointing at this type, as shown above.

Note that images already have a tag piece type, `@apostrophecms/image-tag`, and
files do too, `@apostrophecms/file-tag`. You don't have to create a new module in order
to import these.

## Importing multiple types at once

If you wish, you can specify multiple comma-separated pairs of types:

```bash
node app @apostrophecms/import-a2-tags:import --types=type1:type1-tag,type2:type2-tag
```

Again, the tag piece types must exist in your project, except for
`@apostrophecms/image-tag` and `@apostrophecms/file-tag` which exist by default.
