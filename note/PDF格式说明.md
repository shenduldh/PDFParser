# PDF文件简介

> 参考文章：https://blog.csdn.net/steve_cui/article/details/81910632

PDF文件是一种编程形式的文档格式，它所有显示的内容，都是通过相应的操作符进行绘制的。

PDF基本显示单元包括：矢量文字、矢量图片；PDF扩展单元包括：水印、电子署名、注释、表单、多媒体、3D等；PDF动作单元：书签、超链接等。

PDF文件的优势：

1. 一致性：在所有可以打开PDF的机器上展示的效果是完全一致。而且文档本身可以嵌入字体，避免客户端没有对应字体而导致文字显示不一致的问题。
2. 不易修改：对已经保存之后的PDF文件，想要进行重新排版，基本上就不可能的，这就保证了从资料源发往外界的资料，不容易被篡改。
3. 安全性：PDF文档可以进行加密，包括以下几种加密形式：文档打开密码、文档权限密码、文档证书密码等，加密方法包括：RC4、AES等。
4. 不失真：PDF文件使用矢量图，在文件浏览时，无论放大多少倍，都不会导致文字和图形失真。
5. 压缩：为了减少PDF文件的size，PDF格式支持各种压缩方式：asciihex、ascii85、lzw、runlength、ccitt、jbig2、jpeg(DCT)，jpeg2000(jpx)等。
6. 支持多种印刷标准：PDF-A、PDF-X等。

# PDF格式简单分析

> PDF文件源码格式参考文章：
>
> https://zxyle.github.io/PDF-Explained/chapter3.html
>
> https://zhuanlan.zhihu.com/p/355153775
>
> https://blog.csdn.net/steve_cui/article/list/2

```txt
%PDF-1.0
%超过127字节的任意字符代码
(n) (n) obj
(x)
endobj
xref
(x)
trailer
<<
(x)
>> 
startxref
(x)
%%EOF
```

1. PDF文件本身是二进制数据，但它采用UTF-8进行编码。也就是说，读取PDF文件后得到的是一连串的二进制数，然后再将其用UTF-8进行编码，就可以得到明确格式的字符串。

2. %表示标题行，第一个标题行指出PDF版本，第二个标题行填入超过127字节的任意字符代码，以确保整个PDF可以作为二进制文件被传输。

3. obj和endobj标志（对象）的块属于PDF的body部分，即实际内容部分。对象有以下几种类型：

   - 字典对象：由<<和>>标识。字典用于创建Trailer、文件信息（文件创建日期、作者等）、目录、页面层级关系等，具体参考[这里](https://zxyle.github.io/PDF-Explained/chapter4.html)。

     ```
     (n) (n) obj
     <<
     (x)
     >>
     endobj
     ```

   - 流对象：流字典<< (x) >>说明流的一些属性，stream和endstream包围的块就是流数据（二进制数据）。用于创建pdf文件的实际内容，比如图形和文本，具体参考[图形](https://zxyle.github.io/PDF-Explained/chapter5.html)和[文本](https://zxyle.github.io/PDF-Explained/chapter6.html)。

     ```
     (n) (n) obj
     << (x) >>
     stream
     (x)
     endstream
     endobj
     ```

   - 对象也可以创建书签、导航和注释、插入XML和超链接等，看[这里](https://zxyle.github.io/PDF-Explained/chapter7.html)。

4. xref和startxref标志的块属于交叉引用表，用于快速定位内容。

   交叉引用表列出了所有obj的位置，每个obj位置的格式都为xxxx 0000 n/f。其中xxxx部分是以byte计的文档位置，00000是该object的修改次数，除了第一行永远是65535之外，其他几乎永远都是00000；n/f表示该obj是否可用（free/new），除了第一行永远是f之外，其余各行几乎永远都是n。

5. trailer后面<<和>>包围的块属于文件尾部字典，用于记录一些信息。

6. %%EOF表示文件结束。

7. (n)表示要填入数字，属于所在对象的唯一标识，用于定位；(x)表示要填入一些符合PDF语法的内容。

# PDF格式完整分析

## PDF结构

> 参考文章：
>
> ① https://blog.csdn.net/steve_cui/article/details/81948486
>
> ② 一种解析和处理PDF格式文档的解决方案

PDF 的物理结构包括四个部分：文件头、文件体、交叉引用表和文件尾。

1. 文件头指明了该文件所遵从 PDF 规范的版本号，它出现在PDF文件的第一行；
2. 文件体由一系列的 PDF 间接对象组成，这些间接对象构成了 PDF 文件的具体内容；
3. 交叉引用表则是为了能对间接对象进行随机存取而设立的一个间接对象地址索引表；
4. 文件尾声明了交叉引用表的地址，指明文件体的根对象 ，还保存了加密安全信息和文档信息。根据文件尾提供的信息，PDF 的应用程序可以控制整个 PDF 文件。

PDF 的逻辑结构反映了文件体中间接对象间的等级层次关系，是一种树型结构。树的根节点是 PDF 文件的根对象（Catalog）。根节点下有四棵子树：页面树（Pages Tree）、书签树（Outline Tree）、线索树（Article Threads）、名字树（Named Destination）。

1. 页面树的叶节点均为页面对象，每一个页面对象都保存了 PDF 在该页的内容（也是一系列对象的集合），比如文本、图像和注释等。树中的子节点将继承父节点的各属性值作为相应属性的缺省值；
2. 书签树按树形层次等级关系将书签（Book mark）组织起来，书签建立了书签名与一个具体页面上的位置的关联，它使得用户可以按书签名字来访问文档的内容；
3. 线索树将文章线索以及线索下的各文章块（Article Bead），按照树型的结构组织起来进行管理；
4. 名字树建立了一种字符串（即名字）和页面区域的对应关系，树中的各叶子节点保存着字符串及其相应的页面区域，而非叶子节点则只是一种索引。

<img src="https://img-blog.csdn.net/2018082217325989?watermark/2/text/aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3N0ZXZlX2N1aQ==/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70" alt="PDF结构" style="zoom:60%;" /> <img src="https://img-blog.csdn.net/20180822175236281?watermark/2/text/aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3N0ZXZlX2N1aQ==/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70" style="zoom:60%;" /> 

## PDF字符集

PDF是大小写敏感的语言，即A和a是不一样的。PDF字符集分为三种：

1. 空白字符

   空白字符包括Null(NUL)、Tab(HT)、Line Feed(LF)、Form Feed(FF)、Carriage return(CR)、Space(SP)。除了在comment、string、streams中，所有的空白符都是一样的。PDF把多个连续的空白符看作一个。

2. 分割字符

   分隔字符包括 ( ,  ) ,  < ,  > , [ , ] , { , } , / 和 % 。它们用于将各个语法实体划分成诸如串、数组、名称和注释等等。

3. 常规字符

   除了上面的两种字符之外的字符都称作常规字符。

## PDF注释

注释没有语义，只是注释说明作用。注释以%开头一直到本行结尾。例如：

```
abc% comment {/%) blah blah blah
123
```

 其中，"comment {/%) blah blah blah"就是注释。

## PDF对象

> 参考文章：
>
> https://blog.csdn.net/steve_cui/article/details/81912528
>
> [\<\<PDF reference>>语法说明](https://blog.csdn.net/jinshixie/article/details/51095771)
>
> [\<\<PDF reference>>语法部分中文版](https://www.doc88.com/p-146571502350.html?r=1)

PDF的Body部分由对象集合组成，其对象包括：boolean（布尔型）、number（数值型）、string（字符串型）、name（名字型）、array（数组型）、dictionary（字典型）、stream（数据流型）、null（空类型）、indirect（间接型）。

1. **Boolean**对象

   只有true和false两个值，用于数组型对象和字典型对象。

2. **Number**对象

   包括integer（整数）和real（浮点数）。

3. **String**对象

   ① Literal string：始末标志为 ( 和 ) ，内容为ASCII字符序列，但单括号(或)和反斜线\须做特殊处理，即\\(、\\)、\\\），以下Literal string都是有效对象：

   ```
   (This is a string)
   (Strings may contain newlines
   and such.)
   (Strings may contain balanced parentheses ( ) and
   special characters (*!&}^% and so on).)
   (The following is an empty string.)
   ()
   (It has zero (0) length.) 
   ```

   ② Hexadecimal string：由"<"和">"作为对象的始末标志，内容为十六进制数组成的序列（0-9和A-F或a-f）：

   ```
   <4E6F762073686D6F7A206B6120706F702E>
   ```

4. **Name**对象

   名称对象。一个斜线字符/引导一个名称。斜线不是名称的一部分但是它是名称的前缀表明它后面所跟的序列字符构成一个名称。名称中斜线和第一个字符间没有空格字符。名称可以包括任何常规字符但不包括分隔符或空格符。大小写被看成是有区别的/A 和/a 是两个不同的名称。从PDF1.2以后版本，名称可以使用"#"+2个16进制数字来表示那些不能显示的ASCII码。以下是合法的名称：

   ```
   /Name1
   /ASomewhatLongerName
   /A;Name_With−Various***Characters?
   /1.2
   /$$
   /@pattern
   /.notdef
   ```

5. **Array**对象

   Array对象是一个一维对象集合，集合可以包括String对象、Name对象等任何其他对象。如果要组成多维数组，可以通过嵌套方式实现。

   ```
   [549 3.14 false (Ralph) /SomeName]
   ```

6. **Dictionary**对象

   字典对象是键值对的集合。其中，key是唯一的且类型必须是name对象，value的类型是任意PDF支持的对象类型，当value为"null"，则表示该键值对不存在。字典对象以"<<"和">>"作为对象的开始和结束。

   字典对象是构建PDF文档的主要结构，通常它们都是一些有特定意义的属性组成的复杂对象集合，一般每个字典中都包含“Type”名字对象，该对象的值表示字典对象描述的具体对象，如“Page”表示该字典是页对象，“Outline”表示该字典对象是书签对象。

   ```
   <<
   /Type /Example
   /Subtype /DictionaryExample
   /Version 0.01
   /IntegerItem 12
   /StringItem (a string)
   /Subdictionary <<
   				/Item1 0.4
   				/Item2 true
   				/LastItem (not!)
   				/VeryLastItem (OK)
   			  >>
   >>
   ```

7. **Stream**对象

   Stream对象和String对象一样也是字节序列，但是不一样的是Stream对象可以被PDF应用程序递增的读取，而不是像String对象要整个读入内存。Stream对象可以不限长度的，而String对象是长度后受平台最大字符长度的限制。

   Stream对象包括一个Dictionary对象和stream和endstream关键字，以及stream和endstream中包含的一行或者多行字节。Stream对象必须包含在Indirect对象中，但其中的Dictionary对象不能是Indirect对象。格式如下：

   ```
   dictionary
   stream
   …Zero or more lines of bytes…
   Endstream
   ```

   Stream对象中的Dictionary对象可以包含以下条目：

   <img src="https://cdn.jsdelivr.net/gh/shenduldh/image@main/img/image-20210504160921320.png" alt="image-20210504160921320" style="zoom:67%;" /> 

8. **Null**对象

   Null对象不等于任何对象，用关键字null代表。

9. **Indirect**对象

   间接引用对象。PDF中的任何对象都可以被封装成一个间接引用对象，使得该对象封装的内容可以在其他地方被引用。Indirect对象由一个对象号（索引号）、一个版本号和关键字"obj"和"endobj"组成。

   ```
   12 0 obj
   (Brillig)
   Endobj
   % 12为Object Number，0为Generation Number，Indirect对象值为(Brillig)。
   ```

   通过间接引用（如 12 0 R ）来引用一个间接对象的内容，比如：

   （该例子定义了一个Indirect对象，它的Object Identifier是7 0，它字典中长度对应的值引用了一个Object Identifier为8 0的Indirect对象）

   ```
   7 0 obj
   <</Length 8 0 R>>
   stream
   BT
   /F1 12 Tf
   72 712 Td
   (A stream with an indirect length) Tj
   ET
   endstream
   Endobj
   ```

   注意，如果引用了一个没有定义的Indirect对象，并不报错，而是等价于引用了一个Null对象（值为null）。

## PDF压缩

> 参考文章：https://blog.csdn.net/steve_cui/article/details/81947208

在PDF中，为了让文件变的更小，通常的做法是将stream对象进行压缩，因为stream对象的数据块比较大。

从PDF1.5开始往后的版本，支持了流对象，可以把多个对象（非stream对象）放到同一个stream对象中，并进行压缩，达到减少文件大小的效果。

stream对象字典属性Filter指定的就是压缩类型。一个stream对象，可以单次压缩，也可以多次压缩。`/Filter [/ASCII85Decode /LZWDecode]`表示被描述的这个stream对象进行ASCII85Decode和LZWDecode两次压缩，因此对该stream进行解压缩的时候，也要按照反顺序分别解压缩。

PDF支持的Filter可以分为三大类：

1. ASCII filters：ASCIIHexDecode、ASCII85Decode。这种编码类型可以将8位二进制数据编码成ASCII文本。这种类型的Filter不能用在被加密的PDF文档中。
2. 加密filters：LZWDecode、FlateDecode、RunLengthDecode、CCITTFaxDecode、JBIG2Decode、DCTDecode、JPXDecode。这些压缩类型包括无损压缩和有损压缩。
3. 加密filter：Crypt。这是一种特殊类型，这个类型是指对该stream对象进行单独加密。 

## PDF文本对象

> 参考文章：PDF文档解析与内容脱敏技术研究

流对象中的流数据块由一系列操作数和操作符构成，且操作数必须是直接对象，不能为间接对象及引用对象。操作符是指定要执行的操作，比如在页面上绘制一个图形或显示某些文本内容。需注意该操作符区别于名称对象是前面没有“/”，且操作符只有在内容流内才有意义。

在流数据块中，由操作符 BT 和 ET 包围的内容就属于文本对象，该文本对象可以包含以下内容：

1. 文本字体信息：通过 Tf 操作符设置字体信息。Tf 有 2 个参数，分别代表字 体的名称和大小。
2. 文本位置信息：操作符 Td/TD 用于设置文本行的位置，Td/TD 也有参数 Tx 和 Ty（分别表示描述当前行的水平、垂直位移）。
3. 文本矩阵：描述字体和换行信息。通过文本矩阵操作符 Tm 来设置文本矩阵，即[Sx 0 0 Sy Tx Ty]，其中 Tx 和 Ty 含义如上，参数 Sx 和 Sy 表示字体的宽度和高度。
4. 文本内容：Tj/TJ 操作符用于写入文本内容，即我们需要提取的文本内容，其位置在操作符前括号内的文本串。

**PDF的中文转码问题**

由上述可知，PDF 文本的内容在 TJ/Tj 操作符的前面，英文的文本内容一般在一对圆括号里，中文的文本内容一般在一对尖括号里面；如果寻找到的是 Tj 参数，那么就直接提取括号里的内容；如果寻找到的是 TJ 参数，说明在每对括号的前面还有一些控制信息，这时需要去掉这些数字控制信息，再提取出括号内的内容；如果遇到转义字符“\”标志则不用提取，去掉即可。

但因中文字符通常是由多个字节构成的宽字符，和英文字符数量比较，中文汉字数量很大，因此在 PDF 文件中，为了减少文件大小，PDF 文件为中文汉字使用 CID 编码。因此为了得到能够显示的 Unicode 编码，需要一个从 CID 编码到 Unicode 编码的转换过程：字节码 -> CMap -> CID -> CID文件 -> 显示字形。具体过程如下：

1. 如果字体字典包含有 ToUnicode Cmap，则用这个 Cmap 直接将字符码转换为Unicode。

2. 如果字体为简单字体，用 MacRomanEncoding、MacExpertEncoding、WinAnsiEncoding 任意一种预定义编码，或有 Differences array 的编码，其包含Adobe 标准拉丁字符集或 Symbol font 的字符名字：

   A. 通过 Differences array 或字符集直接将字符码转换为字符名字；

   B. 在 Adobe Glyph List 表找到字符名字获得相应的 Unicode 值。

3. 如果字体为复杂字体，用预定义 Cmap，或使用 the Adobe\-GB1、Adobe\-CNS1 等字符集：

   A. 通过这个字体的 Cmap 把字符码转换为 CID；

   B. 通过这个 Cmap 使用的字符集从 CIDSystemInfo 字典获得其 registry、ordering；

   C. 通过 B 步骤获得的信息，构建二次 CMap name，如 registry–ordering–UCS2；

   D. 通过 C 步骤获得这个 Cmap name 获得 CMap（可从 ASN 网站上获得）；

   E. 从 A、D 步骤获得的 CID 及 Cmap，把 CID 转换为 Unicode 值。

> 什么是CID编码？
>
> CID编码是Adobe公司发表的最新字库格式。CID分为CIDFont、CMap两部分。CIDFont称为总字符集，保存了各个字符的字型数据和对应的CID标识码（即该字符在总字符集中字型数据的索引）；CMap表是字符映像文件，可以根据字符的编码（字节码）映射到该字符的CID标识码，然后在CIDFont文件中找到相应的字型数据，最后进行显示。

## PDF文件头

> 参考文章：https://blog.csdn.net/steve_cui/article/details/81981943

文件头一般在PDF文件的第一行，它用来定义PDF的版本，从而确定该PDF遵循的哪个版本的PDF规范。PDF版本是向前兼容的。常见PDF版本文件头如下所示：

```
%PDF-1.0
%PDF-1.1
%PDF-1.2
%PDF-1.3
%PDF-1.4
%PDF-1.5
%PDF-1.6
%PDF-1.7（最常见）
%PDF-1.8（非常少见）
```

以上都是常见的版本号，此外还有其他特殊版本，如PDF/X、PDF/E、PDF/A和PDF/VT等，它们在PDF文件中表现为文件头版本+OutputIntent相结合来标识版本。
在Catalog字典中，存在Version属性，它的值也是PDF版本号，该版本号如果高与文件头版本号，则采用这里的版本号，否则忽略。这里的Version属性是可选的，通常是在写PDF增量的情况下用到。因为原PDF文件进过编辑后，添加或修改的内容需要遵循的版本比原本更高，而增量写的方式要求原PDF文件内容不修改，因此只要增量部分写入Catalog对象，就可以改变PDF的版本号。

PDF文件头有些情况下，并不只保存了版本号，还可能添加用户自定义的内容，以满足用户的特殊需求。

## PDF交叉引用表

> 参考文章：https://blog.csdn.net/steve_cui/article/details/82152721

PDF交叉引用表保存所有间接对象在PDF文件中的物理偏移地址。该表在文件中可以存在单个，也可以存在多个。多个交叉引用表通常出现在两个情况：① 增量保存；② 线性化。

PDF交叉引用表形式如下所示：

![交叉引用表](https://img-blog.csdn.net/20180828175640652?watermark/2/text/aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3N0ZXZlX2N1aQ==/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70) 


交叉引用表以单词"xref"开头。图中，"0  4"表示以下表内容属于对象号为从0开始的连续4个间接对象。其中，对象号为0和3的间接对象不存在(f)，对象号为1和2的对象使用中(n)。对象号为1的间接对象的起始位置是17，版本号是0。

一个文件中出现多个交叉引用表时，可能出现同一个间接对象存在于不同的引用表中，这时以出现在文件最后位置的那个为准，前面的忽略。这种情况通常是由于修改PDF文件，导致其中一个或多个对象发生变化，PDF生成器根据输出要求在文件末尾加上更新的交叉引用表。

那么交叉引用表的位置如何查找呢？首先在文件末尾存在以下内容：

```
startxref
217929
%%EOF
```

"217929"就是交叉引用表的偏移位置。当存在多个交叉引用表时，通常在交叉引用表之后的Trailer字典中会保存"/Prev"属性，该属性的值就是前一个交叉引用表的位置。

## PDF尾部

PDF尾部字典包含以下属性：

- /Size [int]：指定交叉引用表中的条目数。
- /Prev [int]：指定从文件开头到上一个交叉引用部分的偏移量。
- /Root [indirect]：文档目录字典对象的间接引用，用于告诉PDF阅读器其文档目录字典对象在哪里。
- /Encrypt [indirect]：文档加密字典对象的间接引用，用于告诉PDF阅读器其文档加密字典对象在哪里。
- /Info [indirect]：文档信息字典对象的间接引用，用于告诉PDF阅读器其文档信息字典对象在哪里。
- /ID [array]：指定形成文件标识符的两个字节未加密字符串的数组。
- /XrefStm [int]：指定从解码流中的文件开头到交叉引用流的偏移量。

## PDF目录对象和页面对象

PDF目录对象（Catelog）和页面对象（Page）指出了PDF文件中各个内容（也就是存储了实际内容的对象）之间的层级关系，这种关系可以用树结构来描述，而PDF目录对象就是这颗树的起点。

https://blog.csdn.net/steve_cui/article/details/82735039

https://blog.csdn.net/steve_cui/article/details/82285871

## PDF文档信息对象

PDF文档信息对象（INFO）是描述PDF文档信息的对象。

https://blog.csdn.net/steve_cui/article/details/82259585

## PDF超链接

https://blog.csdn.net/steve_cui/article/details/82380970

## PDF书签

https://blog.csdn.net/steve_cui/article/details/82351650

## PDF线性化

> 参考文章：https://blog.csdn.net/steve_cui/article/details/82428782

PDF文件线性化是PDF文件的一种特殊格式，使得Internet可以更快地查看PDF文件，即快速显示PDF文件的第一页，而PDF文件的其余部分仍在下载中。

线性化PDF文件的主要目标是：

1. 打开文档时，尽快显示第一页。
2.  要查看的第一页可以是文档的任意页面，不一定是页面0。
3. 当用户请求打开文档的另一页时，尽快显示该页面。
4. 当页面数据通过慢速通道传送时，在页面到达时以递增方式显示页面。 尽可能先显示最有用的数据。
5. 即使在收到并显示整个页面之前，也允许执行用户交互。

已经线性化的PDF，可以进行增量更新，但是修改后的文档就不再是线性化文件，需要重新整理文件才能再次生成线性化文件。

## PDF交叉引用流

> 参考文章：https://blog.csdn.net/yinqingwang/article/details/50674627

PDF交叉引用流是存储交叉引用信息的一种新的方式，用来代替之前的交叉引用表。它有以下优势：

1. 存储的信息更紧凑，并且可以引入压缩算法进行压缩。
2. 提供了访问存储于对象流中的被压缩的对象的功能。
3. 提供了将来可扩展的交叉引用流的表项类型，以便存储更多不同信息。

交叉引用流对象在PDF文件中的偏移位置由关键字startxref指出，而相应的交叉引用表则由关键字xref指出。交叉引用流对象的类型为XRef，即其对象类型具有如下形式："/Type  /XRef"。

<img src="https://cdn.jsdelivr.net/gh/shenduldh/image@main/img/image-20210430224332933.png" alt="image-20210430224332933" style="zoom:80%;" /> 

## PDF增量更新

> 参考文章：https://blog.csdn.net/steve_cui/article/details/82251702

增量更新提供一种更新PDF文件而无需完全重写的方法，其工作方式为：可以逐步更新PDF文件的内容，而无需重写整个文件，更改将附加到文件末尾，保留原始内容。

<img src="https://img-blog.csdn.net/20180830174928941?watermark/2/text/aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3N0ZXZlX2N1aQ==/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70" alt="这里写图片描述" style="zoom: 50%;" /> 


没有增量更新的PDF文件的基本结构由4部分组成：

```
头
对象
交叉参考表
trailer
```

具有一个增量更新的PDF文件具有以下结构：

```
头
对象（原创内容）
交叉参考表（原始内容）
trailer（原创内容）
对象（更新内容）
交叉引用表（更新内容）
trailer（更新内容）
```

已修改的每个对象都可以在PDF文件中找到两次。未修改的对象仍然存在于原始内容中，并且可以在更新的内容中找到相同对象的编辑版本。更新的交叉引用表索引更新的对象，并且更新的尾部指向两个交叉引用表。当PDF阅读器呈现PDF文档时，它从文件末尾开始。它读取最后一个尾部并跟随到根对象和交叉引用表的链接，以构建它将要呈现的文档的逻辑结构。当阅读器遇到更新的对象时，它会忽略相同对象的原始版本。

一个PDF文件允许增量更新的次数不受限制。简单的判断PDF是否增量更新的方法是：文档中存在多个"%%EOF"。

## PDF解密和加密

https://blog.csdn.net/steve_cui/article/details/82257603

## PDF水印

https://blog.csdn.net/steve_cui/article/details/82692393