function readFile(file) {
    const fileReader = new FileReader()
    if ((file instanceof Blob) && file.type == 'application/pdf')
        fileReader.readAsBinaryString(file)
    else
        alert('文件类型不对或其他错误!')
    fileReader.onprogress = a => {
        const progress = parseInt(a.loaded / a.total) * 100 + '%'
        document.getElementById('loadProgress').innerText = 'File loading progress:' + progress
    }
    fileReader.onload = () => {
        const data = fileReader.result
        const parser = new PDFParser(data)
        parser.run()
        console.log('============Parse Result============')
        console.log(parser.tokens)
    }
}

/* 问题1：pdf源文件本身格式出错。
    解决：提供pdf修复。
出错举例：PDF文档解析与内容脱敏技术研究.pdf
314 0 obj
<</BBox[0 0 11.00 16.00]/Length 230/Matrix[6.54 0 0 4.50 0 0]/Subtype/Form/Type/XObject>>stream
154 0 obj
<</BBox [0 0 11.002  16.004  ]/Length 0/Matrix [6.544  0 0 4.4989  0 0 ]/Subtype /Form/Type /XObject>>
stream
154 0 obj
<</BBox[0 0 11.002 16.004]/Length 0/Matrix[6.544 0 0 4.4989 0 0]/Subtype/Form/Type/XObject>>stream
endstream
endobj
*/

/* ✅问题2：注释出现在难以去除的地方。
    解决：想办法去除注释。
    思考：注释以%开始到行末结束，在任何地方都生效，除了version、%%EOF、在Literal string中、在stream和endstream内
出错举例：PDF文档解析与内容脱敏技术研究.pdf
trailer
<</Size 708/Root 707 0 R/Info 16 0 R/ID [<f0b5abce7966b89460e1c6565edfe2b2><a15bde13864bf2bb3876a2c46d9b9fb4>]>>
%iText-5.5.13
startxref
*/
