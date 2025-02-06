/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cl8yn3jhpox1inm")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "kuas2oqn",
    "name": "winnerName",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cl8yn3jhpox1inm")

  // remove
  collection.schema.removeField("kuas2oqn")

  return dao.saveCollection(collection)
})
