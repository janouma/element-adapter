// DOC DRAFT

// props

width
height
orientation
aspectRatio
characters
characters for editable divs
children


// compoled queries

compiledQueries = {
  classA: [
    [
      {width: greaterThanOrEqual(length(6.25, 'em'))},
      {height: lesserThan(length(50, 'h%'))}
    ],

    [ {'aspect-ratio': lesserThanOrEqual(constant(16/9))} ],
    [ {width: greaterThanOrEqual(constant(680))} ]
  ],

  classB: [
    [ {orientation: equal(constant('landscape'))} ]
  ],

  classC: [
    [ {width: greaterThan(length(75, 'w%'))} ]
  ],

  classD: [
    [ {characters: greaterThan(constant(10))} ]
  ],

  classE: [
    [
      {children: greaterThanOrEqual(constant(2))},
      {children: lesserThan(constant(5))}
    ]
  ],

  classF: [
    [ {characters: equal(constant(0))} ]
  ]
}