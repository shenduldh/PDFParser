class PDFParser {
    constructor(rawPDF) {
        this.rawPDF = rawPDF
        this.tokens = {
            version: [],
            xobject: [],
            xref: [],
            trailer: [],
            startxref: [],
            endflag: []
        }
    }

    run() {
        this.tokenize()
        this.parse()
    }

    // 从二进制pdf文件中提取各部分内容（header、body、xref、trailer）
    tokenize() {
        let pdf = this.rawPDF.trim()
        let match, last

        const go = length => pdf = pdf.slice(length).trim()
        const save = (tokenType, tokenValue) => this.tokens[tokenType].push(tokenValue)

        while (pdf) {
            last = pdf

            // version
            if (match = pdf.match(/^%PDF-([0-9.]+)/)) {
                save('version', parseFloat(match[1]))
                go(match[0].length)
                continue
            }

            // end
            if (match = pdf.match(/^%%EOF/)) {
                save('endflag', match[0])
                go(match[0].length)
                continue
            }

            // annotation
            // 此处代码用于删除单独成一行的注释（该情况不会出现在stream和string中，因此不必考虑是否存在其中）
            // 出现在字典和数组中的注释将会被自动略过，不用考虑
            // 在stream和string中以%开头的文本不是注释，不用考虑
            // xref出现的注释可以不用管（for now），不用考虑
            // version和endflag不是注释，不用考虑
            // 综上，只需考虑出现在body、trailer、startxref中的注释
            //   ① 对于trailer，直接把字典外的内容（即注释）去除即可
            //   ② 对于startxref，暂时不考虑
            //   ③ 对于body，直接将匹配到的内容中对象之外的注释删除即可（利用getObjFromStr函数）
            if (match = pdf.match(/^%[^\n\r]+[\r\n]{1,2}/)) {
                go(match[0].length)
                continue
            }

            // body
            if (match = pdf.match(/^([0-9]+)\s+([0-9]+)\s+obj([\S\s]*?)endobj/)) {
                // 利用getObjFromStr函数清除注释
                const objs = getObjFromStr(match[3])
                const objStr = (objs[0] || '') + (objs[1] || '')
                const obj = parseObject(objStr)
                save('xobject', {
                    type: obj.type,
                    value: obj.value,
                    index: parseInt(match[1]),
                    version: parseInt(match[2])
                })
                go(match[0].length)
                continue
            }

            // xref
            if (match = pdf.match(/^xref([\S\s]*?)trailer/)) {
                save('xref', match[1].trim())
                go(match[0].length - 7)
                continue
            }

            // trailer
            if (match = pdf.match(/^trailer[\S\s]*?(<<[\S\s]*?>>)[\S\s]*?startxref/)) {
                save('trailer', parseObject(match[1]).value)
                go(match[0].length - 9)
                continue
            }

            // startxref
            if (match = pdf.match(/^startxref\s+([0-9]+)/)) {
                save('startxref', parseInt(match[1]))
                go(match[0].length)

                // pdf文件本身是二进制数据，但采用UTF-8编码
                // JS采用UTF-8编码显示字符，因此读取pdf文件的二进制数据并将其用JS的字符串显示
                // 得到的就是具有明确格式的pdf文本
                // const xrefIndex = parseInt(match[1])
                // console.log('================')
                // console.log(rawPDF.slice(xrefIndex, xrefIndex + 4))

                continue
            }

            if (last == pdf) throw (new Error(`在索引${nowIndex}处解析出错.`))
        }
    }

    // 根据pdf文档结构，将提取的内容组织为树
    parse() {
        const tokens = this.tokens
        const xobject = tokens.xobject
        const trailer = tokens.trailer
        const rootIndex = find_reverse(trailer, v => !!v['Root'])['Root']
        const root = find_reverse(xobject, v => v.index == rootIndex)
        const pagesIndex = root.value['Pages']
        const pages = find_reverse(xobject, v => v.index == pagesIndex)
        const kids = pages.value['Kids'].map(kidIndex => find_reverse(xobject, v => v.index == kidIndex))

        const contentIndexs = kids[0].value['Contents']
        if (typeof contentIndexs == 'number') {
            const content = find_reverse(xobject, v => v.index = contentIndexs)
            console.log(content)
        } else if (Array.isArray(contentIndexs)) {
            const contents = contentIndexs.map(ctnIndex => find_reverse(xobject, v => v.index == ctnIndex))
            console.log(contents)
            // const dataStr = contents[0].value.data
            // const dataArr = stringToUint8Array(dataStr)
            // const inflate = new Zlib.RawInflate(dataArr)
            // const plain = inflate.decompress();
            // console.log(plain)
        }

        // function stringToUint8Array(str) {
        //     var arr = [];
        //     for (var i = 0, j = str.length; i < j; ++i) {
        //         arr.push(str.charCodeAt(i));
        //     }
        //     var tmpUint8Array = new Uint8Array(arr);
        //     return tmpUint8Array
        // }
        // function Uint8ArrayToString(fileData) {
        //     var dataString = "";
        //     for (var i = 0; i < fileData.length; i++) {
        //         dataString += String.fromCharCode(fileData[i]);
        //     }
        //     return dataString
        // }
    }
}

// 输入仅包含单个对象的字符串，提取其中的必要内容
// ⭐表示需要迭代
function parseObject(objStr) {
    let match
    const echo = (type, value) => { return { type, value } }
    objStr = objStr.trim()

    // boolean: true、false
    if (match = objStr.match(/^(true|false)$/))
        return echo('boolean', match[0] == 'true' ? true : false)

    // null: null
    if (match = objStr.match(/^null$/))
        return echo('null', null)

    // reference: 0-9 0-9 R
    if (match = objStr.match(/^([0-9]+)\s+[0-9]+\s+R$/))
        return echo('reference', parseInt(match[1]))

    // number: 0-9 +- .
    // 3.12、-0.77、666、-888
    if (match = objStr.match(/^[+-]?[0-9]*\.[0-9]+$/))
        return echo('real', parseFloat(match[0]))

    if (match = objStr.match(/^[+-]?[0-9]+$/))
        return echo('integer', parseInt(match[0]))

    // name: /example
    if (match = objStr.match(/^\/([^\s\[\]\(\)\<\>\{\}\/\%]+)$/))
        return echo('name', match[1])

    // string: (文字) <16进制>
    if (match = objStr.match(/^\(([\s\S]+)\)$|^<([0-9a-fA-F]+)>$/))
        return echo('dictionary', match[1] || match[2])

    // ⭐array: [ ]
    if (match = objStr.match(/^\[([\s\S]+)\]$/))
        return echo('array', getObjFromStr(match[1]).map(objStr => parseObject(objStr).value))

    // ⭐stream: << >> stream endstream
    if (match = objStr.match(/^(<<[\s\S]+>>)\s*stream([\s\S]*)endstream$/))
        return echo('stream', {
            config: parseObject(match[1]).value,
            data: match[2]
        })

    // ⭐dictionary: << >>
    if (match = objStr.match(/^<<([\s\S]+)>>$/)) {
        const objs = getObjFromStr(match[1])
        const dict = {}
        let k, v, step = 0
        while (step + 1 < objs.length) {
            // try {
            k = parseObject(objs[step]).value
            v = parseObject(objs[step + 1]).value
            dict[k] = v
            step += 2
            // } catch {
            //     console.log('==============ParseObject Wrror=================')
            //     console.log("源内容：" + objStr)
            //     console.log("匹配后：" + match[1])
            //     console.log(objs)
            //     break
            // }
        }
        return echo('dictionary', dict)
    }

    return echo('null', null)
}

// 输入字符串，提取其中的对象
// 可以用于清除注释
function getObjFromStr(content) {
    content = content.trim()
    let char, str, match, index = content.length - 1
    const objs = []
    const store = obj => objs.unshift(obj)
    const isClosed = {
        ')': 0,
        ']': 0,
        '>>': 0
    }

    while (index >= 0) {
        str = ''
        char = content[index]

        if (char == '>') {
            char = content[--index]
            // Dictionary
            if (char == '>') {
                let nextChar
                str += '>>'
                isClosed['>>']++
                while (isClosed['>>'] > 0 && index >= 0) {
                    index--
                    char = content[index]
                    nextChar = content[index - 1]
                    str = char + str
                    if (char == '<' && nextChar == '<') {
                        isClosed['>>']--
                        str = nextChar + str
                        index--
                    } else if (char == '>' && nextChar == '>') {
                        isClosed['>>']++
                        str = nextChar + str
                        index--
                    }
                }
                store(str)
                index--
                continue
            }
            // Hexadecimal string
            match = content.slice(0, index + 2).match(/<[0-9a-fA-F]+?>$/)
            if (match) {
                store(match[0])
                index -= match[0].length + 1
            } else {
                index--
            }
            continue
        }

        // Literal string
        if (char == ')') {
            let nextChar
            str += ')'
            isClosed[')']++
            while (isClosed[')'] > 0 && index >= 0) {
                index--
                char = content[index]
                nextChar = content[index - 1]
                if (char == '(' && nextChar != '\\') {
                    isClosed[')']--
                } else if (char == ')' && nextChar != '\\') {
                    isClosed[')']++
                }
                str = char + str
            }
            store(str)
            index--
            continue
        }

        // Array
        if (char == ']') {
            str += ']'
            index--
            isClosed[']']++
            while (isClosed[']'] > 0 && index >= 0) {
                char = content[index]
                if (char == '[') {
                    isClosed[']']--
                } else if (char == ']') {
                    isClosed[']']++
                }
                str = char + str
                index--
            }
            store(str)
            continue
        }

        // Name
        if (char == '/') {
            let i = index + 1
            char = content[i]
            str += '/'
            while (/[^\s\[\]\(\)\<\>\{\}\/\%]/.test(char)
                && i < content.length) {
                str += char
                i++
                char = content[i]
            }
            store(str)
            index--
            continue
        }

        // Reference
        if (char == 'R') {
            if (match = content.slice(0, index + 1).match(/[0-9]+\s+[0-9]+\s+R$/)) {
                store(match[0])
                index -= match[0].length
            } else {
                index--
            }
            continue
        }

        // Number
        if (/[0-9]/.test(char)) {
            // 处理与name对象的冲突
            if (match = content.slice(0, index + 1).match(/\/\S+$/)) {
                index--
                continue
            }
            if (match = content.slice(0, index + 1).match(/[0-9+-.]+$/)) {
                store(match[0])
                index -= match[0].length
            } else {
                index--
            }
            continue
        }

        // Boolean、Null
        if (char == 'e' || char == 'l') {
            if (match = content.slice(0, index + 1).match(/(true|false|null)$/)) {
                store(match[0])
                index -= match[0].length
            } else {
                index--
            }
            continue
        }

        // Stream
        if (char == 'm') {
            if (match = content.slice(0, index + 1).match(/stream[\S\s]*endstream$/)) {
                store(match[0])
                index -= match[0].length
            } else {
                index--
            }
            continue
        }

        // Annotation：直接略过
        if (/[\n\r]/.test(char)) {
            const snippet = content.slice(0, index + 1)
            match = snippet.match(/%[^\n\r]+[\r\n]{1,2}$/)
            if (match && !checkIndex(snippet, match.index)) {
                index -= match[0].length
            } else {
                index--
            }
            continue
        }

        index--
    }

    return objs
}

// 检查目标索引是否被包含在stream和lstring中
function checkIndex(content, targetIndex) {
    let char, str, match, start, end, index = content.length - 1
    let isClosed = 0

    while (index >= 0) {
        str = ''
        char = content[index]

        // Literal string
        if (char == ')') {
            let nextChar
            str += ')'
            isClosed++
            while (isClosed > 0 && index >= 0) {
                index--
                char = content[index]
                nextChar = content[index - 1]
                if (char == '(' && nextChar != '\\') {
                    isClosed--
                } else if (char == ')' && nextChar != '\\') {
                    isClosed++
                }
                str = char + str
            }
            start = content.indexOf(str)
            end = start + str.length - 1
            if (start < targetIndex && end > targetIndex) return true
            index--
            continue
        }

        // Stream
        if (char == 'm') {
            if (match = content.slice(0, index + 1).match(/stream[\S\s]*endstream$/)) {
                start = match.index
                end = start + match[0].length - 1
                if (start < targetIndex && end > targetIndex) return true
                index -= match[0].length
            } else {
                index--
            }
            continue
        }

        index--
    }

    return false
}

// 从后往前查询数组
function find_reverse(array, handler) {
    for (let i = array.length - 1; i >= 0; i--)
        if (handler(array[i])) return array[i]
    return null
}
