const razorToAST = require('./razorToAST')
const {
  doc: {
    // https://github.com/prettier/prettier/blob/main/commands.md
    builders: { concat, indent, dedent, softline, hardline, line}
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

function formatRazor(node) {
  switch (node.type) {
    case 'tag':
      return formatTag(node)
    case 'text':
      return formatText(node)
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
      innerVals = concat([innerVals, hardline, formatRazor(element, false)])
    });
  }

  // Based on the type
  if (node.name == '{'){
    formattedCode = concat([node.name.trim(), indent(innerVals), softline, '}'])
  }
  else{
    formattedCode = concat([node.name.trim(), innerVals])
  }

  return formattedCode
}

function formatComment(node) {
  return concat([softline, node.content.trim()])
}

function formatText(node) {
  return concat([node.content.trim()])
}

function formatTag(node) {
  // https://www.w3schools.com/html/html5_syntax.asp
  var innerHTML = ''
  var attribs = ''
  var endTag = ''
  var headTag
  var hasInnerElement = false

  // Handle the attributes
  for (const [key, value] of Object.entries(node.attrs)) {
    attribs = concat([attribs, ' ', key.toLowerCase(), "=\"", value, "\""])
  }

  // Handle the inner html or text
  if (Array.isArray(node.children)) {
    var count = node.children.length
    // Loop through values
    node.children.forEach((element, i) => {
      switch (element.type) {
        case 'tag':
          innerHTML = concat([innerHTML, hardline, formatRazor(element)])
          hasInnerElement = true
          break
        case 'code':
          var isCode1 = i + 1 >= count ? false : node.children[i + 1].type == 'code'
          var isCode2 = i - 1 < 0 ? false : node.children[i - 1].type == 'code'
          if (isCode1 || isCode2){
            innerHTML = concat([innerHTML, softline, formatRazor(element)])
          }
          else{
            innerHTML = concat([innerHTML, formatRazor(element)])
          }
          if (element.name == '{'){
            hasInnerElement = true
          }
          break
        default:
          innerHTML = concat([innerHTML, formatRazor(element)])
          break
      }
    });

    if(hasInnerElement) {
      innerHTML = concat([innerHTML, dedent(line)])
    }
    innerHTML = indent(innerHTML)
  }

  if(!node.voidElement){
    endTag = concat(['</', node.name, '>'])
  }

  headTag = concat(['<', node.name.toLowerCase(), attribs, '>'])

  // Return the tag
  return concat([headTag, innerHTML, endTag])
}

module.exports = {
  languages,
  parsers,
  printers
}