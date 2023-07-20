const assert = require('assert');
const testUtil = require('apostrophe/test-lib/test');

describe('A2 tag importer', function () {

  this.timeout(10000);

  let apos;

  after(() => {
    testUtil.destroy(apos);
  });

  it('Should instantiate the module', async () => {
    apos = await testUtil.create({
      shortname: 'import-a2-tags',
      testModule: true,
      modules: {
        '@apostrophecms/import-a2-tags': {},
        article: {
          extend: '@apostrophecms/piece-type',
          fields: {
            add: {
              _tags: {
                type: 'relationship',
                withType: 'article-tag'
              }
            }
          }
        },
        'article-tag': {
          extend: '@apostrophecms/piece-type'
        }
      }
    });
    assert(apos.modules['@apostrophecms/import-a2-tags']);
  });

  it('Should be able to insert articles with legacy style tags properties', async () => {
    const req = apos.task.getReq();
    for (let i = 1; (i <= 10); i++) {
      await apos.modules.article.insert(req, {
        title: `Article ${i}`,
        tags: [
          `Tag ${i}`, `Tag ${i + 1}`
        ]
      });
    }
  });

  it('Should be able to import A2 legacy tags from articles as A3 relationships', async () => {
    const req = apos.task.getReq();
    await apos.task.invoke('@apostrophecms/import-a2-tags:import', {
      types: 'article:article-tag'
    });
    const articles = await apos.modules.article.find(req).toArray();
    for (let i = 1; (i <= 10); i++) {
      const article = articles.find(article => article.title === `Article ${i}`);
      assert(article);
      assert(article.tagsIds.length === 2);
      assert(article.tagsFields);
      assert(Object.keys(article.tagsFields).length === 2);
      assert(article._tags);
      assert(article._tags.length === 2);
      assert(article._tags[0].title === `Tag ${i}`);
      assert(article._tags[1].title === `Tag ${i + 1}`);
    }
    const tags = await apos.modules['article-tag'].find(req).toArray();
    assert(tags.length === 11);
    // Verify everything exists both as draft and as published
    const modes = [ 'draft', 'published' ];
    for (const aposMode of modes) {
      assert((await apos.doc.db.countDocuments({ type: 'article', aposMode })) === 10);
      assert((await apos.doc.db.countDocuments({ type: 'article-tag', aposMode })) === 11);
    }
  });
});
