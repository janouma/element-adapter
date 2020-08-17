# element-adapter

Renders dom element(s) adaptive according to their own properties, thus allowing "container queries".

It is inspired by [EQCSS](https://elementqueries.com) and [Watched Box](https://github.com/Heydon/watched-box).

# Demo
You can see it in action on this [demo](https://janouma.github.io/element-adapter)

# Usage example

Given the following markup

```html
<div class="component A" contenteditable>
  Lorem ipsum dolor sit amet...
</div>

<div class="component B">
  <div>Child One</div>
  <div>Child Two</div>
</div>

<input class="component C" type="text" value="foo" />
<textarea class="component D">bar</textarea>
```

adaptive behaviours can be added like this

```javascript
import addAdaptiveBehaviour from 'element-adapter'

addAdaptiveBehaviour({
  target: document.querySelectorAll('.component'),

  queries: {
    classA: `width >= 6.25em && height < 50%, aspect-ratio <= ${16 / 9}, width >= 680px`,
    classB: 'orientation == landscape',
    classC: 'width > 75%',
    classD: 'characters == 0, characters > 10',
    classE: 'children >= 2 && children < 5'
  }
})
```
Here are some `queries` explained:

**1st query:**
```javascript
// classA: `width >= 6.25em && height < 50%, aspect-ratio <= ${16 / 9}, width >= 680px`

ADD 'classA' WHEN
  (
    width >= 6.25em
    AND
    height < 50% // of the parent container height
  )

  // the coma acts like OR
  OR aspect-ratio <= 16/9

  // the coma acts like OR
  OR width >= 680px
```
  
**5th query:**
```javascript
// classE: 'children >= 2 && children < 5'

ADD 'classE' WHEN
  children >= 2
  AND
  children < 5
```

# css variables
In addition to css classes, css custom properties *( variables )* are set on watched elements:

property | type | unit
-------- | ---- | ----
`--ea-width` | float | `px`
`--ea-height` | float | `px`
`--ea-orientation` | `landscape`, `portrait` or `square` | -
`--ea-aspect-ratio` | float | -
`--ea-children` | integer | -
`--ea-characters` | integer | -

This allows to write adaptive css even without queries *( see [`watchedProperties`](#watchedProperties) option for additional details )*, like in the following example:

```css
input {
  width: calc(var(--ea-characters, 4) * 1ch);
}
```
Here the targeted `input` element will grow wider as the number of characters typed increases, with a default set to `4ch`.

> ### Note
> - editable elements *( `input[type=text|email|...]`, `textarea` and `[contenteditable]`)* never get the `--ea-children` property *– and internally the `children` property is set to `0` for queries evaluation*
>
> - non-editable elements never get the `--ea-characters` property *– and internally the `characters` property is set to `0` for queries evaluation*

# Parameters
## Required
### target
Can be a single `Element`, a `NodeList` or an array of `Element`s
## Optional
### queries
***Required if no watched property is provided.***
```javascript
queries: {
  cssClassA: <query a>,
  cssClassB: <query b>,
  ...
}
```
#### Formal query syntax

```css
<expression>[,<expression>]*

where <expression> = <comparison>[ && <comparison>]*

  and <comparison> = [ width | height ] <comparator> [ <css percentage> | <css length> ]
                     || aspect-ratio <comparator> <float>
                     || [ children | characters ] <comparator> <integer>
                     || orientation == [ landscape | portrait | square ]
  
  and <comparator> = [ > | >= | < | <= | == ]
```

### <a name="watchedProperties"></a> watchedProperties
***Required if no query is provided.***

By default only properties appearing in `queries` are watched, meaning observers and listeners will be instantated only for these, thus css variables *( `--ea-*` )* will only be set according to those.

For example, if you have only the following query `'width > 75%'` only a `ResizeObserver` will be instantiate and only dimension related property will be set *( `--ea-width`, `--ea-height`, `--ea-aspect-ratio` and `--ea-orientation)` )*.

If you have only this one `'children >= 2 && children < 5'` only a `MutationObserver` will be instantated and only `--ea-children` will be set.

So if you don't need queries and only wishes to use css variables, using the `watchedProperties` option changes the default behaviour: additional properties listed in this array are watched too.

Here is the syntax:

```javascript
addAdaptiveBehaviour({
  target: document.querySelector('#componentA'),
  watchedProperties: ['characters', 'width']
})
```

# Clean up

The function provided by `element-adapter` returns a handler object allowing to unregister created listeners and observers when you no longer need adaptive behaviours – *before the `target` is removed from the dom for instance*.

It can be used like this:

```javascript
const { removeAdaptiveBehaviour } = addAdaptiveBehaviour({...})
///
removeAdaptiveBehaviour()
```

Calling the clean up function will remove any applied behaviours *( css classes and variables )*.

# Manually applying behaviours

if you use `element-adapter` with a front-end lib like say `VueJs`, and you use reactive props to update the `class` attribute of the element you are adding adaptive behaviours to, like in the following code,

```html
<input ref="email" name="email" :class="{ invalid: usernameFailure }" type="email">
```

then the classes applied by `element-adapter` will be stripped every time your component is updated – *since the VueJS lib is not aware of the classes imperatively applied outside his scope*.

For those cases `element-adapter` provides a function which, when called, will re-run all the queries and re-apply behavioural classes according to the element new state.

It can be used like this:

```javascript
mounted () {
  ({ applyAdaptiveBehaviour: this.applyAdaptiveBehaviour } = addAdaptiveBehaviour({
    target: this.$refs.email,

    queries: {
      'chars-between-19-and-28': 'characters >= 19 && characters <= 28',
      'chars-gt-28': 'characters > 28'
    }
  }))
},

updated () {
  // one of the css classes .chars-between-19-and-28 and .chars-gt-28
  // will be added eventually, according to the number of characters
  // typed in the field
  this.applyAdaptiveBehaviour()
}
```

# Browsers compatibility
Tested on **Safari**, **Chrome** and **Firefox**
