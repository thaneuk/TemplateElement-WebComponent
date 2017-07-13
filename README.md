# TemplateElement WebComponent

Attempt at a simple template and parent/child data inheritance in a web component.

e.g.
```
<component-name data-name="dataPath"></component-name>
```

Will scan parent component or parent host default view (window) for the data path described in attribute and assign it to `this.data[name]`. Multiples are accomodated.

When imported the Template will also try to fill the innerText of elements with any bind tags found and create attributes e.g. `[title]="<datapath>"` would create a title attribute, populated if data found.

this.updateBindings() can be called to attempt to re-populate.

Added watcher functions to look for primitive value changes on a timer (experimental) and attribute change. Currently 0.01ms time expense.

useage in a component:
```
this.$watch('data.name.value', (oldValue, newValue) => {
    // do something
});
```
