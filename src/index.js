const razorToAST = require('./razorToAST')
const {
  doc: {
    // https://github.com/prettier/prettier/blob/main/commands.md
    builders: { concat, group, indent, dedent, softline, hardline }
  }
} = require('prettier')

const languages = [
  {
    extensions: ['.razor'],
    name: 'Razor',
    parsers: ['razor-parse']
  }
]

const parsers = {
  'razor-parse': {
    parse: text => razorToAST(text),
    astFormat: 'razor-ast'
  }
}

const printers = {
  'razor-ast': {
    print: printRazor
  }
}

function printRazor(path, options, print) {
  const node = path.getValue()

  if (Array.isArray(node)) {
    return concat(path.map(print))
  }

  return concat([formatRazor(node), hardline])
}

function formatRazor(node, hasLines = true) {
  switch (node.type) {
    case 'tag':
      return formatTag(node)
    case 'text':
      return formatText(node, hasLines)
    case 'code':
      return formatCode(node)
    case 'comment':
      return formatComment(node)
    default:
      return ''
  }
}

function formatCode(node) {
  // https://www.w3schools.com/asp/razor_syntax.asp
  var innerVals = ''

  // Handle the inner html or text
  if (Array.isArray(node.children)) {
    // Loop through values
    node.children.forEach(element => {
      innerVals = concat([innerVals, formatRazor(element)])
    });
  }

  // Based on the type
  if (node.name == '{'){
    return concat([node.name, softline, group(indent(innerVals))])
  }
  else if(node.name == '}'){
    return group(dedent(concat([node.name, softline, innerVals])))
  }
  else{
    return concat([node.name, softline, innerVals])
  }
}

function formatComment(node) {
  return concat([node.content.trim(), softline])
}

function formatText(node, hasLines) {
  if (hasLines) {
    return concat([node.content.trim(), softline])
  }
  else {
    return concat([node.content.trim()])
  }
}

function formatTag(node) {
  // https://www.w3schools.com/html/html5_syntax.asp
  var innerHTML = ''
  var attribs = ''
  var hasInnerHTML = false

  // Handle the attributes
  for (const [key, value] of Object.entries(node.attrs)) {
    attribs = concat([attribs, ' ', key.toLowerCase(), "=\"", value, "\""])
  }

  // Handle the inner html or text
  if (Array.isArray(node.children)) {
    // Loop through values
    node.children.forEach(element => {
      switch (element.type) {
        case 'tag':
          innerHTML = concat([innerHTML, hardline, formatRazor(element)])
          hasInnerHTML = true
          break
        default:
          innerHTML = concat([innerHTML, formatRazor(element, false)])
          break
      }
    });

    if(hasInnerHTML) {
      innerHTML = concat([innerHTML, hardline])
    }
    innerHTML = group(indent(innerHTML))
  }

  // Return the tag
  return concat(['<', node.name.toLowerCase(), attribs, '>', innerHTML, '</', node.name, '>'])
}

module.exports = {
  languages,
  parsers,
  printers
}