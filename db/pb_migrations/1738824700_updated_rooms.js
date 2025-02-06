/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cl8yn3jhpox1inm")

  // remove
  collection.schema.removeField("jcociu6l")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "mx7lqrwa",
    "name": "currentSvgCodes",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jcociu6l",
    "name": "field",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 2000000
    }
  }))

  // remove
  collection.schema.removeField("mx7lqrwa")

  return dao.saveCollection(collection)
})
