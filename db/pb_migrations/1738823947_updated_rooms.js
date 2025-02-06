/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cl8yn3jhpox1inm")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "7zmeldkr",
    "name": "usedSvgCodes",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "noDecimal": false
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cl8yn3jhpox1inm")

  // remove
  collection.schema.removeField("7zmeldkr")

  return dao.saveCollection(collection)
})
