/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cl8yn3jhpox1inm")

  // remove
  collection.schema.removeField("simgzt3y")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xgcu7kbl",
    "name": "currentSvgCode",
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

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "mx7lqrwa",
    "name": "usedSvgCodes",
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
    "id": "simgzt3y",
    "name": "currentSvgCode",
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

  // remove
  collection.schema.removeField("xgcu7kbl")

  // update
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
})
