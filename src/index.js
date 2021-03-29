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
    parsers: ['razor-parse'],
    vscodeLanguageIds: 'razor',
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
    node.children.forEach((element, i) => {
      switch (element.type) {
        case 'text':
          if (element.content == ''){
            innerVals = concat([innerVals, softline])
          }
          else{
            innerVals = concat([innerVals, formatRazor(element)])
          }
          break
        case 'code':
          var needsNewline = i - 1 < 0 ? true : node.children[i - 1].type == 'code'
          if (needsNewline){
            innerVals = concat([innerVals, formatRazor(element), softline])
          }
          else{
            innerVals = concat([innerVals, formatRazor(element)])
          }
          break
        case 'comment':
          innerVals = concat([innerVals, formatRazor(element)])
          break
        default:
          innerVals = concat([innerVals, formatRazor(element)])
          break
        }
    });
    if (node.name == '{' || node.name.includes('@{')){
      innerVals = concat([softline, innerVals, dedent(line)])
    }
  }

  // Based on the type
  if (node.name == '{' || node.name.includes('@{')){
    formattedCode = concat([node.name.trim(), indent(innerVals), '}'])
  }
  else if (node.name.toLowerCase().indexOf('@if') == 0 || node.name.toLowerCase().indexOf('@for') == 0){
    formattedCode = concat([softline, node.name.trim(), innerVals])
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
  return node.content.trim()
}

function formatTag(node) {
  // https://www.w3schools.com/html/html5_syntax.asp
  var innerHTML = ''
  var attribs = ''
  var endTag = ''
  var headTag
  var hasInnerElement = false
  var hasNewline = false

  // Handle the attributes
  for (const [key, value] of Object.entries(node.attrs)) {
    attribs = concat([attribs, ' ', key, "=\"", value, "\""])
  }

  // Handle the inner html or text
  if (Array.isArray(node.children)) {
    // Loop through values
    node.children.forEach((element, i) => {
      switch (element.type) {
        case 'tag':
          innerHTML = concat([innerHTML, hardline, formatRazor(element)])
          hasInnerElement = true
          break
        case 'code':
          var isNoNewline = i - 1 < 0 ? true : (node.children[i - 1].type == 'text' && node.children[i - 1].content != '')
          if(element.name == '{' || element.name.includes('@{')){
            innerHTML = concat([innerHTML, softline, formatRazor(element)])
            hasInnerElement = true
          }
          else if(isNoNewline){
            innerHTML = concat([innerHTML, formatRazor(element), " "])
          }
          else{
            innerHTML = concat([innerHTML, softline, formatRazor(element)])
          }
          break
        case 'comment':
          innerHTML = concat([innerHTML, formatRazor(element)])
          hasInnerElement = true
          break
        default:
          var isNewline = element.type == 'text' && element.content == ''
          if (isNewline){
            hasNewline = true
            innerHTML = concat([innerHTML, softline])
          }
          else{
            innerHTML = concat([innerHTML, formatRazor(element)])
          }
          break
      }
    });

    if(hasInnerElement || hasNewline) {
      innerHTML = concat([innerHTML, dedent(line)])
    }
    innerHTML = indent(innerHTML)
  }

  if(!node.voidElement){
    endTag = concat(['</', node.name, '>'])
    headTag = concat(['<', node.name, attribs, '>'])
  }
  else{
    headTag = concat(['<', node.name, attribs, '/>'])
  }

  // Return the tag
  return concat([headTag, innerHTML, endTag])
}

module.exports = {
  languages,
  parsers,
  printers
}