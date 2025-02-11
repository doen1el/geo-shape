/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3085411453")

  // add field
  collection.fields.addAt(14, new Field({
    "hidden": false,
    "id": "number105650625",
    "max": null,
    "min": null,
    "name": "category",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3085411453")

  // remove field
  collection.fields.removeById("number105650625")

  return app.save(collection)
})
