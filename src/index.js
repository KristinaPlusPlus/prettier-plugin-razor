const razorToAST = require('./razorToAST')
const {
  doc: {
    // https://github.com/prettier/prettier/blob/main/commands.md
    builders: { concat, indent, dedent, softline, hardline}
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

  return concat([formatRazor(node), softline])
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

function formatCode(node, hasLines) {
  // https://www.w3schools.com/asp/razor_syntax.asp
  var innerVals = ''

  // Handle the inner html or text
  if (Array.isArray(node.children)) {
    // Loop through values
    node.children.forEach(element => {
      innerVals = concat([innerVals, formatRazor(element, false)])
    });
  }

  // Based on the type
  if (node.name == '{'){
    formattedCode = concat([node.name.trim(), softline, indent(innerVals), softline, '}'])
  }
  else{
    formattedCode = concat([node.name.trim(), innerVals])
  }

  if (hasLines) {
    return concat([formattedCode, softline])
  }
  else {
    return formattedCode
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
  var endTag = ''
  var headTag
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
    innerHTML = indent(innerHTML)
  }

  if(!node.voidElement){
    endTag = concat(['</', node.name, '>'])
  }

  headTag = concat(['<', node.name.toLowerCase(), attribs, '>'])

  // Return the tag
  return concat([headTag, innerHTML, dedent(endTag)])
}

module.exports = {
  languages,
  parsers,
  printers
}