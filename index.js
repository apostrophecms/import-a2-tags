module.exports = {
  init(self) {
    self.addMigration();
  },
  methods(self) {
    return {
      addMigration() {
        self.apos.migration.add('import-a2-tags-fix-invalid-ids', async () => {
          await self.apos.migration.eachDoc({
            'tagsIds.0': { $exists: 1 }
          }, async doc => {
            let changed = false;
            let tagsIds = doc.tagsIds.map(tagId => {
              if (tagId.includes(':')) {
                tagId = tagId.split(':')[0];
                changed = true;
              }
              return tagId;
            });
            if (changed) {
              await self.apos.doc.db.updateOne({
                _id: doc._id
              }, {
                $set: {
                  tagsIds
                }
              });
            }
          });
        });
      }
    };
  },
  tasks(self) {
    return {
      import: {
        usage: 'Import A2-style tags properties to an A3 relationship with --types=type1:type1-tag',
        async task(argv = {}) {
          const req = self.apos.task.getReq();
          const { types } = argv;
          if (!types) {
            throw 'You must specify --types=type1:type1-tag,type2:type2-tag';
          }
          const pairs = types.split(',');
          for (const pair of pairs) {
            const [ fromType, toType ] = pair.split(':');
            if (!fromType || !toType) {
              throw 'You must specify --types=type1:type1-tag,type2:type2-tag';
            }
            if (!Object.hasOwn(self.apos.modules, toType)) {
              throw `The piece type module ${toType} does not exist`;
            }
            const to = self.apos.modules[toType];
            // Find all subclasses too
            const fromTypes = Object.keys(self.apos.modules).filter(type => self.apos.modules[type].__meta.chain.find(entry => entry.name === fromType));
            if (!fromTypes.length) {
              throw `The module ${fromType} does not exist and is not a base class for any other active module`;
            }
            for (const type of fromTypes) {
              const tagIds = new Map();
              await self.apos.migration.eachDoc({
                type,
                'tags.0': { $exists: 1 }
              }, async doc => {
                const tags = doc.tags;
                for (const name of tags) {
                  const localeParams = {};
                  if (doc.aposLocale) {
                    localeParams.locale = doc.aposLocale.split(':')[0];
                    localeParams.mode = doc.aposMode;
                  }
                  const localeReq = req.clone(localeParams);
                  const tagId =
                    tagIds.get(name) ||
                    (await to.find(localeReq, { title: name }).toObject())?.aposDocId ||
                    (await insert({
                      title: name
                    })).aposDocId;
                  tagIds.set(name, tagId);
                  await self.apos.doc.db.updateOne({
                    _id: doc._id
                  }, {
                    $addToSet: {
                      tagsIds: tagId
                    },
                    $set: {
                      [`tagsFields.${tagId}`]: {}
                    }
                  });

                  async function insert(data) {
                    const tag = await to.insert(localeReq, data);
                    if (tag.aposMode === 'draft') {
                      if (!to.options.autopublish) {
                        await to.publish(localeReq, tag);
                      }
                    }
                    return tag;
                  }
                }
              });
            }
          }
        }
      }
    };
  }
};
