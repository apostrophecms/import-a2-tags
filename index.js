module.exports = {
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
            for (const type of fromTypes) {
              const tagIds = new Map();
              await self.apos.migration.eachDoc({
                type,
                'tags.0': { $exists: 1 }
              }, async doc => {
                const tags = doc.tags;
                for (const name of tags) {
                  let tagId =
                    tagIds.get(name)
                    || (await to.find(req, { title: name }).toObject())?._id
                    || (await to.insert(req, {
                      title: name
                    }))._id;
                  tagIds.set(name, tagId);
                  await self.apos.doc.db.updateOne({
                    _id: doc._id
                  }, {
                    $addToSet: {
                      'tagsIds': tagId
                    }
                  });
                }
              });
            }
          }
        }
      }
    };
  },
};
