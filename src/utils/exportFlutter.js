import JSZip from 'jszip'
import { saveAs } from 'file-saver'

function expand(documentJson, node) {
  if (node.type === 'component') { const c = documentJson.components?.[node.componentId], source = c?.variants?.[node.variant] || c?.variants?.[c?.defaultVariant]; return source ? expand(documentJson, { ...source, style: { ...source.style, ...node.style } }) : { type: 'text', text: 'Missing component', style: {} } }
  return { ...node, children: node.children?.map((child) => expand(documentJson, child)) }
}

function dartString(value = '') { return JSON.stringify(String(value)) }
function color(hex = '#000000') { return `Color(0xFF${String(hex).replace('#', '').padStart(6, '0').slice(0, 6).toUpperCase()})` }
function edge(style = {}) { return `EdgeInsets.all(${style.padding || 0}.0)` }
function nodeToDart(node, indent = 6) {
  const p = ' '.repeat(indent), s = node.style || {}, children = (node.children || []).map((c) => nodeToDart(c, indent + 2)).join(',\n')
  if (node.type === 'text') return `${p}Text(${dartString(node.text)}, style: TextStyle(fontSize: ${(s.fontSize || 14)}.0, fontWeight: ${(s.fontWeight || 400) >= 600 ? 'FontWeight.bold' : 'FontWeight.normal'}, color: ${color(s.color)}))`
  if (node.type === 'button') return `${p}SizedBox(width: ${s.width || 140}.0, height: ${s.height || 44}.0, child: ElevatedButton(onPressed: () {}, style: ElevatedButton.styleFrom(backgroundColor: ${color(s.background || '#4f46e5')}), child: Text(${dartString(node.text)})))`
  if (node.type === 'image') return `${p}Image.network(${dartString(node.src)}, width: ${s.width || 320}.0, height: ${s.height || 180}.0, fit: BoxFit.cover)`
  if (node.type === 'input') return `${p}SizedBox(width: ${s.width || 260}.0, child: TextField(decoration: InputDecoration(hintText: ${dartString(node.placeholder)}, border: const OutlineInputBorder())))`
  if (node.type === 'icon') return `${p}Text(${dartString(node.icon)}, style: TextStyle(fontSize: ${(s.fontSize || 22)}.0, color: ${color(s.color)}))`
  const widget = s.flexDirection === 'row' ? 'Row' : 'Column'
  return `${p}Container(padding: ${edge(s)}, width: ${s.width ? `${s.width}.0` : 'null'}, decoration: BoxDecoration(color: ${s.background && s.background !== 'transparent' ? color(s.background) : 'null'}, borderRadius: BorderRadius.circular(${s.borderRadius || 0}.0)), child: ${widget}(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [\n${children}\n${p}]))`
}
export async function exportAsFlutterProject(documentJson, projectName = 'vibeframe-flutter') {
  const zip = new JSZip(), root = zip.folder(projectName)
  const pages = documentJson.order.map((id) => { const page = documentJson.pages[id]; return `      ${dartString(page.title || id)}: SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [\n${page.children.map((node) => nodeToDart(expand(documentJson, node), 10)).join(',\n')}\n        ]))` }).join(',\n')
  root.file('pubspec.yaml', `name: ${projectName}\nenvironment:\n  sdk: '>=3.0.0 <4.0.0'\ndependencies:\n  flutter:\n    sdk: flutter\n`)
  root.folder('lib').file('main.dart', `import 'package:flutter/material.dart';\nvoid main() => runApp(const VibeFrameApp());\nclass VibeFrameApp extends StatelessWidget { const VibeFrameApp({super.key}); @override Widget build(BuildContext context) => MaterialApp(home: DefaultTabController(length: ${documentJson.order.length}, child: Scaffold(appBar: AppBar(title: const Text('VibeFrame'), bottom: const TabBar(isScrollable: true, tabs: [${documentJson.order.map((id) => `Tab(text: ${dartString(documentJson.pages[id].title || id)})`).join(',')} ])), body: TabBarView(children: [\n${pages}\n])))); }`)
  root.file('README.md', '# VibeFrame Flutter export\n\nRun with `flutter pub get` then `flutter run`.')
  saveAs(await zip.generateAsync({ type: 'blob' }), `${projectName}.zip`)
}
