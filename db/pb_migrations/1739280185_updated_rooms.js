/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3085411453")

  // add field
  collection.fields.addAt(14, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3414089001",
    "hidden": false,
    "id": "relation642663334",
    "maxSelect": 999,
    "minSelect": 0,
    "name": "players",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3085411453")

  // remove field
  collection.fields.removeById("relation642663334")

  return app.save(collection)
})
