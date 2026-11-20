/**
 * Centralized file-type icon registry
 *
 * Provides intelligent icon resolution based on:
 * 1. Exact filename (package.json, .gitignore, etc.)
 * 2. Compound extensions (.tar.gz, .d.ts, etc.)
 * 3. File extensions (.js, .py, etc.)
 * 4. MIME type fallback
 * 5. Generic fallback
 *
 * All matching is case-insensitive.
 * Uses Remix Icons for consistency + custom brand icons for technology logos.
 *
 * @module file-icon-registry
 */

import {
  // Files
  RiFileLine,
  RiFileTextLine,
  RiFileCodeLine,
  RiFilePdfLine,
  RiFileExcelLine,
  RiFileWordLine,
  RiFilePptLine,
  RiFileZipLine,
  RiFileMusicLine,
  RiFileVideoLine,
  RiFileImageLine,
  RiFileSettingsLine,
  RiFileLockLine,
  RiFileShieldLine,
  RiFileListLine,
  
  // Folders
  RiFolderLine,
  RiFolderOpenLine,
  RiFolderUploadLine,
  RiFolderDownloadLine,
  RiFolderSettingsLine,
  RiFolderLockLine,
  RiFolderMusicLine,
  RiFolderVideoLine,
  RiFolderImageLine,
  
  // Code & Web
  RiCodeLine,
  RiCodeSSlashLine,
  RiTerminalLine,
  RiTerminalBoxLine,
  RiHtml5Line,
  RiCss3Line,
  RiPhpLine,
  
  // System
  RiGithubLine,
  RiGitlabLine,
  RiDatabaseLine,
  
  // Media
  RiImageLine,
  RiVideoLine,
  RiMusicLine,
  
  // Archive & Data
  RiArchiveLine,
} from '@remixicon/react';

import {
  // Custom brand icons
  RiReactjsLine,
  RiVuejsLine,
  RiAngularjsLine,
  RiSvelteLine,
  RiPythonLine,
  RiGoLine,
  RiRustLine,
  RiSwiftLine,
  RiKotlinLine,
  RiDartLine,
  RiRubyLine,
  RiLuaLine,
  RiRLine,
  RiPerlLine,
  RiDockerLine,
  RiNodeLine,
  RiGitLine,
  RiKeyLine as RiKeyCustomLine,
  RiCertLine,
  RiSqlLine,
  RiGraphqlLine,
  RiFontLine,
  RiExeLine,
  RiApkLine,
  RiLogLine,
  RiProtobufLine,
  RiAstroLine,
} from './custom-icons';

/**
 * Color tokens for icon theming
 * These match BoardUI semantic tokens
 */
const COLORS = {
  // Language colors (brand-matched)
  javascript: '#F7DF1E',
  typescript: '#3178C6',
  react: '#61DAFB',
  vue: '#42B883',
  angular: '#DD0031',
  svelte: '#FF3E00',
  python: '#3776AB',
  ruby: '#CC342D',
  php: '#777BB4',
  go: '#00ADD8',
  rust: '#DEA584',
  swift: '#F05138',
  kotlin: '#7F52FF',
  dart: '#0175C2',
  java: '#E76F00',
  c: '#A8B9CC',
  cpp: '#00599C',
  csharp: '#9B4F96',
  lua: '#000080',
  r: '#276DC3',
  perl: '#39457E',
  
  // Web technologies
  html: '#E44D26',
  css: '#1572B6',
  scss: '#CD6799',
  less: '#1D365D',
  tailwind: '#06B6D4',
  node: '#339933',
  astro: '#FF5D01',
  
  // Data & Config
  json: '#F5A623',
  yaml: '#CB171E',
  xml: '#0060AC',
  toml: '#9C4121',
  ini: '#5C6BC0',
  env: '#EFC82E',
  sql: '#E38D16',
  graphql: '#E10098',
  protobuf: '#4285F4',
  
  // Documents
  pdf: '#FF4438',
  word: '#2B579A',
  excel: '#217346',
  powerpoint: '#D24726',
  markdown: '#083FA1',
  text: '#6B7280',
  
  // Media
  image: '#8B5CF6',
  video: '#EF4444',
  audio: '#EC4899',
  
  // Archives
  archive: '#78716C',
  
  // System
  docker: '#2496ED',
  git: '#F05032',
  key: '#FFB86C',
  cert: '#50FA7B',
  log: '#8BE9FD',
  font: '#9A6FC4',
  
  // Executables
  exe: '#7B8CDE',
  apk: '#3DDC84',
  
  // Fallback
  generic: '#6B7280',
  folder: '#FBBF24',
};

/**
 * Icon definition
 * @typedef {Object} IconDef
 * @property {React.Component} icon - Icon component
 * @property {string} color - Color value (hex or CSS class)
 * @property {string} [label] - Human-readable label
 */

/**
 * Exact filename matches (case-insensitive)
 * @type {Map<string, IconDef>}
 */
const EXACT_FILENAMES = new Map([
  // Package managers
  ['package.json', { icon: RiNodeLine, color: COLORS.node, label: 'Node.js Package' }],
  ['package-lock.json', { icon: RiNodeLine, color: COLORS.node, label: 'Node.js Lock' }],
  ['pnpm-lock.yaml', { icon: RiNodeLine, color: '#F69220', label: 'pnpm Lock' }],
  ['yarn.lock', { icon: RiNodeLine, color: '#2C8EBB', label: 'Yarn Lock' }],
  ['bun.lockb', { icon: RiNodeLine, color: '#FBF0DF', label: 'Bun Lock' }],
  
  // Config files
  ['.gitignore', { icon: RiGitLine, color: COLORS.git, label: 'Git Ignore' }],
  ['.gitattributes', { icon: RiGitLine, color: COLORS.git, label: 'Git Attributes' }],
  ['.gitmodules', { icon: RiGitLine, color: COLORS.git, label: 'Git Modules' }],
  ['.editorconfig', { icon: RiFileSettingsLine, color: '#E0EFE0', label: 'Editor Config' }],
  ['.env', { icon: RiFileSettingsLine, color: COLORS.env, label: 'Environment' }],
  ['.env.local', { icon: RiFileSettingsLine, color: COLORS.env, label: 'Local Environment' }],
  ['.env.development', { icon: RiFileSettingsLine, color: COLORS.env, label: 'Dev Environment' }],
  ['.env.production', { icon: RiFileSettingsLine, color: COLORS.env, label: 'Prod Environment' }],
  ['.env.test', { icon: RiFileSettingsLine, color: COLORS.env, label: 'Test Environment' }],
  ['.eslintrc', { icon: RiFileSettingsLine, color: '#4B32C3', label: 'ESLint Config' }],
  ['.eslintrc.js', { icon: RiFileSettingsLine, color: '#4B32C3', label: 'ESLint Config' }],
  ['.eslintrc.json', { icon: RiFileSettingsLine, color: '#4B32C3', label: 'ESLint Config' }],
  ['.prettierrc', { icon: RiFileSettingsLine, color: '#F7B93E', label: 'Prettier Config' }],
  ['tsconfig.json', { icon: RiFileSettingsLine, color: COLORS.typescript, label: 'TypeScript Config' }],
  ['jsconfig.json', { icon: RiFileSettingsLine, color: COLORS.javascript, label: 'JavaScript Config' }],
  
  // Documentation
  ['readme', { icon: RiFileTextLine, color: COLORS.markdown, label: 'README' }],
  ['readme.md', { icon: RiFileTextLine, color: COLORS.markdown, label: 'README' }],
  ['readme.txt', { icon: RiFileTextLine, color: COLORS.text, label: 'README' }],
  ['license', { icon: RiFileShieldLine, color: '#6B7280', label: 'License' }],
  ['license.md', { icon: RiFileShieldLine, color: '#6B7280', label: 'License' }],
  ['license.txt', { icon: RiFileShieldLine, color: '#6B7280', label: 'License' }],
  ['changelog', { icon: RiFileListLine, color: '#6B7280', label: 'Changelog' }],
  ['changelog.md', { icon: RiFileListLine, color: '#6B7280', label: 'Changelog' }],
  
  // Build & CI
  ['dockerfile', { icon: RiDockerLine, color: COLORS.docker, label: 'Docker' }],
  ['dockerfile.dev', { icon: RiDockerLine, color: COLORS.docker, label: 'Docker Dev' }],
  ['dockerfile.prod', { icon: RiDockerLine, color: COLORS.docker, label: 'Docker Prod' }],
  ['.dockerignore', { icon: RiDockerLine, color: COLORS.docker, label: 'Docker Ignore' }],
  ['docker-compose.yml', { icon: RiDockerLine, color: COLORS.docker, label: 'Docker Compose' }],
  ['docker-compose.yaml', { icon: RiDockerLine, color: COLORS.docker, label: 'Docker Compose' }],
  ['.travis.yml', { icon: RiFileSettingsLine, color: '#3EAAAF', label: 'Travis CI' }],
  ['.gitlab-ci.yml', { icon: RiGitlabLine, color: '#FC6D26', label: 'GitLab CI' }],
  ['jenkinsfile', { icon: RiFileSettingsLine, color: '#D33833', label: 'Jenkins' }],
  
  // Make & Build
  ['makefile', { icon: RiTerminalLine, color: '#EF4444', label: 'Make' }],
  ['cmakelists.txt', { icon: RiTerminalLine, color: '#064F8C', label: 'CMake' }],
  
  // Web frameworks
  ['next.config.js', { icon: RiNodeLine, color: '#000000', label: 'Next.js Config' }],
  ['next.config.mjs', { icon: RiNodeLine, color: '#000000', label: 'Next.js Config' }],
  ['nuxt.config.js', { icon: RiVuejsLine, color: '#00DC82', label: 'Nuxt Config' }],
  ['nuxt.config.ts', { icon: RiVuejsLine, color: '#00DC82', label: 'Nuxt Config' }],
  ['svelte.config.js', { icon: RiSvelteLine, color: COLORS.svelte, label: 'Svelte Config' }],
  ['astro.config.mjs', { icon: RiAstroLine, color: COLORS.astro, label: 'Astro Config' }],
  
  // Misc
  ['composer.json', { icon: RiPhpLine, color: COLORS.php, label: 'Composer' }],
  ['composer.lock', { icon: RiPhpLine, color: COLORS.php, label: 'Composer Lock' }],
  ['gemfile', { icon: RiRubyLine, color: COLORS.ruby, label: 'Gemfile' }],
  ['gemfile.lock', { icon: RiRubyLine, color: COLORS.ruby, label: 'Gemfile Lock' }],
  ['requirements.txt', { icon: RiPythonLine, color: COLORS.python, label: 'Python Requirements' }],
  ['pipfile', { icon: RiPythonLine, color: COLORS.python, label: 'Pipfile' }],
  ['pipfile.lock', { icon: RiPythonLine, color: COLORS.python, label: 'Pipfile Lock' }],
  ['cargo.toml', { icon: RiRustLine, color: COLORS.rust, label: 'Cargo' }],
  ['cargo.lock', { icon: RiRustLine, color: COLORS.rust, label: 'Cargo Lock' }],
  ['go.mod', { icon: RiGoLine, color: COLORS.go, label: 'Go Module' }],
  ['go.sum', { icon: RiGoLine, color: COLORS.go, label: 'Go Sum' }],
  ['pom.xml', { icon: RiFileCodeLine, color: COLORS.java, label: 'Maven' }],
  ['build.gradle', { icon: RiFileCodeLine, color: COLORS.java, label: 'Gradle' }],
  ['build.gradle.kts', { icon: RiFileCodeLine, color: COLORS.java, label: 'Gradle' }],
]);

/**
 * Compound extensions (e.g., .tar.gz, .d.ts)
 * @type {Map<string, IconDef>}
 */
const COMPOUND_EXTENSIONS = new Map([
  ['tar.gz', { icon: RiArchiveLine, color: COLORS.archive, label: 'Compressed Archive' }],
  ['tar.bz2', { icon: RiArchiveLine, color: COLORS.archive, label: 'Compressed Archive' }],
  ['tar.xz', { icon: RiArchiveLine, color: COLORS.archive, label: 'Compressed Archive' }],
  ['d.ts', { icon: RiFileCodeLine, color: COLORS.typescript, label: 'TypeScript Definition' }],
  ['js.map', { icon: RiFileCodeLine, color: COLORS.javascript, label: 'JavaScript Source Map' }],
  ['css.map', { icon: RiFileCodeLine, color: COLORS.css, label: 'CSS Source Map' }],
]);

/**
 * File extension to icon mapping
 * @type {Map<string, IconDef>}
 */
const EXTENSIONS = new Map([
  // --- Programming Languages ---
  ['js', { icon: RiCodeSSlashLine, color: COLORS.javascript, label: 'JavaScript' }],
  ['mjs', { icon: RiCodeSSlashLine, color: COLORS.javascript, label: 'JavaScript Module' }],
  ['cjs', { icon: RiCodeSSlashLine, color: COLORS.javascript, label: 'CommonJS' }],
  ['jsx', { icon: RiReactjsLine, color: COLORS.react, label: 'React JSX' }],
  ['ts', { icon: RiCodeSSlashLine, color: COLORS.typescript, label: 'TypeScript' }],
  ['mts', { icon: RiCodeSSlashLine, color: COLORS.typescript, label: 'TypeScript Module' }],
  ['cts', { icon: RiCodeSSlashLine, color: COLORS.typescript, label: 'TypeScript CJS' }],
  ['tsx', { icon: RiReactjsLine, color: COLORS.react, label: 'React TSX' }],
  ['py', { icon: RiPythonLine, color: COLORS.python, label: 'Python' }],
  ['pyw', { icon: RiPythonLine, color: COLORS.python, label: 'Python' }],
  ['pyi', { icon: RiPythonLine, color: COLORS.python, label: 'Python Stub' }],
  ['php', { icon: RiPhpLine, color: COLORS.php, label: 'PHP' }],
  ['phtml', { icon: RiPhpLine, color: COLORS.php, label: 'PHP HTML' }],
  ['java', { icon: RiFileCodeLine, color: COLORS.java, label: 'Java' }],
  ['class', { icon: RiFileCodeLine, color: COLORS.java, label: 'Java Class' }],
  ['jar', { icon: RiFileZipLine, color: COLORS.java, label: 'Java Archive' }],
  ['kt', { icon: RiKotlinLine, color: COLORS.kotlin, label: 'Kotlin' }],
  ['kts', { icon: RiKotlinLine, color: COLORS.kotlin, label: 'Kotlin Script' }],
  ['swift', { icon: RiSwiftLine, color: COLORS.swift, label: 'Swift' }],
  ['angular', { icon: RiAngularjsLine, color: COLORS.angular, label: 'Angular' }],
  ['c', { icon: RiCodeLine, color: COLORS.c, label: 'C' }],
  ['h', { icon: RiCodeLine, color: COLORS.c, label: 'C Header' }],
  ['cpp', { icon: RiCodeLine, color: COLORS.cpp, label: 'C++' }],
  ['cc', { icon: RiCodeLine, color: COLORS.cpp, label: 'C++' }],
  ['cxx', { icon: RiCodeLine, color: COLORS.cpp, label: 'C++' }],
  ['hpp', { icon: RiCodeLine, color: COLORS.cpp, label: 'C++ Header' }],
  ['cs', { icon: RiCodeLine, color: COLORS.csharp, label: 'C#' }],
  ['go', { icon: RiGoLine, color: COLORS.go, label: 'Go' }],
  ['rs', { icon: RiRustLine, color: COLORS.rust, label: 'Rust' }],
  ['rb', { icon: RiRubyLine, color: COLORS.ruby, label: 'Ruby' }],
  ['dart', { icon: RiDartLine, color: COLORS.dart, label: 'Dart' }],
  ['lua', { icon: RiLuaLine, color: COLORS.lua, label: 'Lua' }],
  ['r', { icon: RiRLine, color: COLORS.r, label: 'R' }],
  ['R', { icon: RiRLine, color: COLORS.r, label: 'R' }],
  ['pl', { icon: RiPerlLine, color: COLORS.perl, label: 'Perl' }],
  ['pm', { icon: RiPerlLine, color: COLORS.perl, label: 'Perl Module' }],
  
  // --- Web Development ---
  ['html', { icon: RiHtml5Line, color: COLORS.html, label: 'HTML' }],
  ['htm', { icon: RiHtml5Line, color: COLORS.html, label: 'HTML' }],
  ['xhtml', { icon: RiHtml5Line, color: COLORS.html, label: 'XHTML' }],
  ['css', { icon: RiCss3Line, color: COLORS.css, label: 'CSS' }],
  ['scss', { icon: RiCss3Line, color: COLORS.scss, label: 'SCSS' }],
  ['sass', { icon: RiCss3Line, color: COLORS.scss, label: 'Sass' }],
  ['less', { icon: RiCss3Line, color: COLORS.less, label: 'Less' }],
  ['styl', { icon: RiCss3Line, color: '#FF686B', label: 'Stylus' }],
  ['vue', { icon: RiVuejsLine, color: COLORS.vue, label: 'Vue' }],
  ['svelte', { icon: RiSvelteLine, color: COLORS.svelte, label: 'Svelte' }],
  ['astro', { icon: RiAstroLine, color: COLORS.astro, label: 'Astro' }],
  
  // --- Data & Configuration ---
  ['json', { icon: RiFileCodeLine, color: COLORS.json, label: 'JSON' }],
  ['jsonc', { icon: RiFileCodeLine, color: COLORS.json, label: 'JSON with Comments' }],
  ['json5', { icon: RiFileCodeLine, color: COLORS.json, label: 'JSON5' }],
  ['xml', { icon: RiFileCodeLine, color: COLORS.xml, label: 'XML' }],
  ['xsl', { icon: RiFileCodeLine, color: COLORS.xml, label: 'XSLT' }],
  ['xslt', { icon: RiFileCodeLine, color: COLORS.xml, label: 'XSLT' }],
  ['yaml', { icon: RiFileCodeLine, color: COLORS.yaml, label: 'YAML' }],
  ['yml', { icon: RiFileCodeLine, color: COLORS.yaml, label: 'YAML' }],
  ['toml', { icon: RiFileCodeLine, color: COLORS.toml, label: 'TOML' }],
  ['ini', { icon: RiFileSettingsLine, color: COLORS.ini, label: 'INI' }],
  ['cfg', { icon: RiFileSettingsLine, color: COLORS.ini, label: 'Config' }],
  ['conf', { icon: RiFileSettingsLine, color: COLORS.ini, label: 'Config' }],
  ['env', { icon: RiFileSettingsLine, color: COLORS.env, label: 'Environment' }],
  ['sql', { icon: RiSqlLine, color: COLORS.sql, label: 'SQL' }],
  ['graphql', { icon: RiGraphqlLine, color: COLORS.graphql, label: 'GraphQL' }],
  ['gql', { icon: RiGraphqlLine, color: COLORS.graphql, label: 'GraphQL' }],
  ['proto', { icon: RiProtobufLine, color: COLORS.protobuf, label: 'Protocol Buffers' }],
  
  // --- Documents ---
  ['pdf', { icon: RiFilePdfLine, color: COLORS.pdf, label: 'PDF' }],
  ['md', { icon: RiFileTextLine, color: COLORS.markdown, label: 'Markdown' }],
  ['mdx', { icon: RiFileTextLine, color: COLORS.markdown, label: 'MDX' }],
  ['txt', { icon: RiFileTextLine, color: COLORS.text, label: 'Text' }],
  ['rtf', { icon: RiFileWordLine, color: COLORS.word, label: 'Rich Text' }],
  ['doc', { icon: RiFileWordLine, color: COLORS.word, label: 'Word Document' }],
  ['docx', { icon: RiFileWordLine, color: COLORS.word, label: 'Word Document' }],
  ['odt', { icon: RiFileWordLine, color: COLORS.word, label: 'OpenDocument Text' }],
  
  // --- Spreadsheets ---
  ['csv', { icon: RiFileExcelLine, color: COLORS.excel, label: 'CSV' }],
  ['tsv', { icon: RiFileExcelLine, color: COLORS.excel, label: 'TSV' }],
  ['xls', { icon: RiFileExcelLine, color: COLORS.excel, label: 'Excel' }],
  ['xlsx', { icon: RiFileExcelLine, color: COLORS.excel, label: 'Excel' }],
  ['ods', { icon: RiFileExcelLine, color: COLORS.excel, label: 'OpenDocument Spreadsheet' }],
  
  // --- Presentations ---
  ['ppt', { icon: RiFilePptLine, color: COLORS.powerpoint, label: 'PowerPoint' }],
  ['pptx', { icon: RiFilePptLine, color: COLORS.powerpoint, label: 'PowerPoint' }],
  ['odp', { icon: RiFilePptLine, color: COLORS.powerpoint, label: 'OpenDocument Presentation' }],
  
  // --- Images ---
  ['png', { icon: RiImageLine, color: COLORS.image, label: 'PNG Image' }],
  ['jpg', { icon: RiImageLine, color: COLORS.image, label: 'JPEG Image' }],
  ['jpeg', { icon: RiImageLine, color: COLORS.image, label: 'JPEG Image' }],
  ['gif', { icon: RiImageLine, color: COLORS.image, label: 'GIF Image' }],
  ['svg', { icon: RiImageLine, color: COLORS.image, label: 'SVG Image' }],
  ['webp', { icon: RiImageLine, color: COLORS.image, label: 'WebP Image' }],
  ['bmp', { icon: RiImageLine, color: COLORS.image, label: 'Bitmap Image' }],
  ['ico', { icon: RiImageLine, color: COLORS.image, label: 'Icon' }],
  ['tiff', { icon: RiImageLine, color: COLORS.image, label: 'TIFF Image' }],
  ['tif', { icon: RiImageLine, color: COLORS.image, label: 'TIFF Image' }],
  ['avif', { icon: RiImageLine, color: COLORS.image, label: 'AVIF Image' }],
  
  // --- Audio ---
  ['mp3', { icon: RiMusicLine, color: COLORS.audio, label: 'MP3 Audio' }],
  ['wav', { icon: RiMusicLine, color: COLORS.audio, label: 'WAV Audio' }],
  ['flac', { icon: RiMusicLine, color: COLORS.audio, label: 'FLAC Audio' }],
  ['aac', { icon: RiMusicLine, color: COLORS.audio, label: 'AAC Audio' }],
  ['ogg', { icon: RiMusicLine, color: COLORS.audio, label: 'OGG Audio' }],
  ['m4a', { icon: RiMusicLine, color: COLORS.audio, label: 'M4A Audio' }],
  ['wma', { icon: RiMusicLine, color: COLORS.audio, label: 'WMA Audio' }],
  
  // --- Video ---
  ['mp4', { icon: RiVideoLine, color: COLORS.video, label: 'MP4 Video' }],
  ['mkv', { icon: RiVideoLine, color: COLORS.video, label: 'MKV Video' }],
  ['mov', { icon: RiVideoLine, color: COLORS.video, label: 'MOV Video' }],
  ['avi', { icon: RiVideoLine, color: COLORS.video, label: 'AVI Video' }],
  ['webm', { icon: RiVideoLine, color: COLORS.video, label: 'WebM Video' }],
  ['wmv', { icon: RiVideoLine, color: COLORS.video, label: 'WMV Video' }],
  ['flv', { icon: RiVideoLine, color: COLORS.video, label: 'FLV Video' }],
  
  // --- Archives ---
  ['zip', { icon: RiFileZipLine, color: COLORS.archive, label: 'ZIP Archive' }],
  ['rar', { icon: RiFileZipLine, color: COLORS.archive, label: 'RAR Archive' }],
  ['7z', { icon: RiFileZipLine, color: COLORS.archive, label: '7-Zip Archive' }],
  ['tar', { icon: RiFileZipLine, color: COLORS.archive, label: 'TAR Archive' }],
  ['gz', { icon: RiFileZipLine, color: COLORS.archive, label: 'GZip Archive' }],
  ['bz2', { icon: RiFileZipLine, color: COLORS.archive, label: 'BZip2 Archive' }],
  ['xz', { icon: RiFileZipLine, color: COLORS.archive, label: 'XZ Archive' }],
  
  // --- Executables & Installers ---
  ['exe', { icon: RiExeLine, color: COLORS.exe, label: 'Executable' }],
  ['msi', { icon: RiExeLine, color: COLORS.exe, label: 'Windows Installer' }],
  ['apk', { icon: RiApkLine, color: COLORS.apk, label: 'Android Package' }],
  ['deb', { icon: RiArchiveLine, color: COLORS.exe, label: 'Debian Package' }],
  ['rpm', { icon: RiArchiveLine, color: COLORS.exe, label: 'RPM Package' }],
  ['dmg', { icon: RiArchiveLine, color: COLORS.exe, label: 'Disk Image' }],
  ['appimage', { icon: RiExeLine, color: COLORS.exe, label: 'AppImage' }],
  
  // --- Fonts ---
  ['ttf', { icon: RiFontLine, color: COLORS.font, label: 'TrueType Font' }],
  ['otf', { icon: RiFontLine, color: COLORS.font, label: 'OpenType Font' }],
  ['woff', { icon: RiFontLine, color: COLORS.font, label: 'Web Font' }],
  ['woff2', { icon: RiFontLine, color: COLORS.font, label: 'Web Font 2' }],
  ['eot', { icon: RiFontLine, color: COLORS.font, label: 'Embedded OpenType' }],
  
  // --- Shell & Scripts ---
  ['sh', { icon: RiTerminalLine, color: '#4EAA25', label: 'Shell Script' }],
  ['bash', { icon: RiTerminalLine, color: '#4EAA25', label: 'Bash Script' }],
  ['zsh', { icon: RiTerminalLine, color: '#4EAA25', label: 'Zsh Script' }],
  ['fish', { icon: RiTerminalLine, color: '#4EAA25', label: 'Fish Script' }],
  ['ps1', { icon: RiTerminalBoxLine, color: '#5391FE', label: 'PowerShell' }],
  ['bat', { icon: RiTerminalLine, color: '#C1C1C1', label: 'Batch' }],
  ['cmd', { icon: RiTerminalLine, color: '#C1C1C1', label: 'Command Script' }],
  
  // --- Version Control ---
  ['git', { icon: RiGitLine, color: COLORS.git, label: 'Git' }],
  
  // --- Certificates & Keys ---
  ['pem', { icon: RiCertLine, color: COLORS.cert, label: 'Certificate' }],
  ['crt', { icon: RiCertLine, color: COLORS.cert, label: 'Certificate' }],
  ['cer', { icon: RiCertLine, color: COLORS.cert, label: 'Certificate' }],
  ['der', { icon: RiCertLine, color: COLORS.cert, label: 'Certificate' }],
  ['key', { icon: RiKeyCustomLine, color: COLORS.key, label: 'Private Key' }],
  ['pub', { icon: RiKeyCustomLine, color: COLORS.key, label: 'Public Key' }],
  
  // --- Logs ---
  ['log', { icon: RiLogLine, color: COLORS.log, label: 'Log File' }],
  
  // --- Database ---
  ['db', { icon: RiDatabaseLine, color: '#E38D16', label: 'Database' }],
  ['sqlite', { icon: RiDatabaseLine, color: '#003B57', label: 'SQLite' }],
  ['sqlite3', { icon: RiDatabaseLine, color: '#003B57', label: 'SQLite' }],
  ['mdb', { icon: RiDatabaseLine, color: '#E38D16', label: 'Access Database' }],
]);

/**
 * Special folder names to distinct icons
 * @type {Map<string, {icon: React.Component, color: string}>}
 */
const SPECIAL_FOLDERS = new Map([
  // Version control
  ['.git', { icon: RiGitLine, color: COLORS.git }],
  
  // Node.js
  ['node_modules', { icon: RiNodeLine, color: COLORS.node }],
  
  // Source code directories
  ['src', { icon: RiFolderLine, color: '#60A5FA' }],
  ['source', { icon: RiFolderLine, color: '#60A5FA' }],
  ['lib', { icon: RiFolderLine, color: '#60A5FA' }],
  
  // Build output
  ['dist', { icon: RiFolderLine, color: '#A78BFA' }],
  ['build', { icon: RiFolderLine, color: '#A78BFA' }],
  ['out', { icon: RiFolderLine, color: '#A78BFA' }],
  ['output', { icon: RiFolderLine, color: '#A78BFA' }],
  
  // Assets
  ['assets', { icon: RiFolderImageLine, color: COLORS.image }],
  ['images', { icon: RiFolderImageLine, color: COLORS.image }],
  ['img', { icon: RiFolderImageLine, color: COLORS.image }],
  ['icons', { icon: RiFolderImageLine, color: COLORS.image }],
  ['videos', { icon: RiFolderVideoLine, color: COLORS.video }],
  ['video', { icon: RiFolderVideoLine, color: COLORS.video }],
  ['audio', { icon: RiFolderMusicLine, color: COLORS.audio }],
  ['music', { icon: RiFolderMusicLine, color: COLORS.audio }],
  ['sounds', { icon: RiFolderMusicLine, color: COLORS.audio }],
  
  // Components & Pages (framework-specific)
  ['components', { icon: RiFolderLine, color: '#34D399' }],
  ['pages', { icon: RiFolderLine, color: '#34D399' }],
  ['app', { icon: RiFolderLine, color: '#34D399' }],
  ['views', { icon: RiFolderLine, color: '#34D399' }],
  
  // Documentation
  ['docs', { icon: RiFolderLine, color: '#FBBF24' }],
  ['documentation', { icon: RiFolderLine, color: '#FBBF24' }],
  
  // Tests
  ['test', { icon: RiFolderLine, color: '#F87171' }],
  ['tests', { icon: RiFolderLine, color: '#F87171' }],
  ['__tests__', { icon: RiFolderLine, color: '#F87171' }],
  ['spec', { icon: RiFolderLine, color: '#F87171' }],
  ['specs', { icon: RiFolderLine, color: '#F87171' }],
  
  // Public & Downloads
  ['public', { icon: RiFolderDownloadLine, color: '#60A5FA' }],
  ['downloads', { icon: RiFolderDownloadLine, color: '#60A5FA' }],
  ['upload', { icon: RiFolderUploadLine, color: '#60A5FA' }],
  ['uploads', { icon: RiFolderUploadLine, color: '#60A5FA' }],
  
  // Config
  ['config', { icon: RiFolderSettingsLine, color: '#9CA3AF' }],
  ['configs', { icon: RiFolderSettingsLine, color: '#9CA3AF' }],
  
  // Security
  ['.ssh', { icon: RiFolderLockLine, color: COLORS.key }],
  ['secrets', { icon: RiFolderLockLine, color: COLORS.key }],
  
  // Git/Version Control
  ['.github', { icon: RiGithubLine, color: COLORS.git }],
  ['.gitlab', { icon: RiGitlabLine, color: '#FC6D26' }],
]);

/**
 * MIME type to icon mapping (fallback)
 * @type {Map<string, IconDef>}
 */
const MIME_TYPES = new Map([
  // Text
  ['text/plain', { icon: RiFileTextLine, color: COLORS.text }],
  ['text/html', { icon: RiHtml5Line, color: COLORS.html }],
  ['text/css', { icon: RiCss3Line, color: COLORS.css }],
  ['text/csv', { icon: RiFileExcelLine, color: COLORS.excel }],
  ['text/markdown', { icon: RiFileTextLine, color: COLORS.markdown }],
  ['text/xml', { icon: RiFileCodeLine, color: COLORS.xml }],
  
  // Application
  ['application/json', { icon: RiFileCodeLine, color: COLORS.json }],
  ['application/javascript', { icon: RiCodeSSlashLine, color: COLORS.javascript }],
  ['application/typescript', { icon: RiCodeSSlashLine, color: COLORS.typescript }],
  ['application/xml', { icon: RiFileCodeLine, color: COLORS.xml }],
  ['application/pdf', { icon: RiFilePdfLine, color: COLORS.pdf }],
  ['application/zip', { icon: RiFileZipLine, color: COLORS.archive }],
  ['application/x-tar', { icon: RiFileZipLine, color: COLORS.archive }],
  ['application/gzip', { icon: RiFileZipLine, color: COLORS.archive }],
  ['application/x-rar-compressed', { icon: RiFileZipLine, color: COLORS.archive }],
  ['application/x-7z-compressed', { icon: RiFileZipLine, color: COLORS.archive }],
  
  // Office
  ['application/msword', { icon: RiFileWordLine, color: COLORS.word }],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', { icon: RiFileWordLine, color: COLORS.word }],
  ['application/vnd.ms-excel', { icon: RiFileExcelLine, color: COLORS.excel }],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', { icon: RiFileExcelLine, color: COLORS.excel }],
  ['application/vnd.ms-powerpoint', { icon: RiFilePptLine, color: COLORS.powerpoint }],
  ['application/vnd.openxmlformats-officedocument.presentationml.presentation', { icon: RiFilePptLine, color: COLORS.powerpoint }],
  
  // Images
  ['image/png', { icon: RiImageLine, color: COLORS.image }],
  ['image/jpeg', { icon: RiImageLine, color: COLORS.image }],
  ['image/gif', { icon: RiImageLine, color: COLORS.image }],
  ['image/svg+xml', { icon: RiImageLine, color: COLORS.image }],
  ['image/webp', { icon: RiImageLine, color: COLORS.image }],
  ['image/bmp', { icon: RiImageLine, color: COLORS.image }],
  ['image/avif', { icon: RiImageLine, color: COLORS.image }],
  
  // Audio
  ['audio/mpeg', { icon: RiMusicLine, color: COLORS.audio }],
  ['audio/wav', { icon: RiMusicLine, color: COLORS.audio }],
  ['audio/ogg', { icon: RiMusicLine, color: COLORS.audio }],
  ['audio/aac', { icon: RiMusicLine, color: COLORS.audio }],
  ['audio/mp4', { icon: RiMusicLine, color: COLORS.audio }],
  
  // Video
  ['video/mp4', { icon: RiVideoLine, color: COLORS.video }],
  ['video/mpeg', { icon: RiVideoLine, color: COLORS.video }],
  ['video/webm', { icon: RiVideoLine, color: COLORS.video }],
  ['video/quicktime', { icon: RiVideoLine, color: COLORS.video }],
  ['video/x-msvideo', { icon: RiVideoLine, color: COLORS.video }],
]);

/**
 * Extract extension from filename (handles compound extensions)
 * @param {string} filename
 * @returns {{ext: string, compoundExt: string|null}}
 */
function extractExtension(filename) {
  const name = filename.toLowerCase();
  
  // Check for compound extensions first
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex === -1) return { ext: '', compoundExt: null };
  
  const ext = name.slice(dotIndex + 1);
  
  // Check for compound extension (e.g., .tar.gz)
  const secondDotIndex = name.lastIndexOf('.', dotIndex - 1);
  if (secondDotIndex !== -1) {
    const compoundExt = name.slice(secondDotIndex + 1);
    return { ext, compoundExt };
  }
  
  return { ext, compoundExt: null };
}

/**
 * Resolve icon for a file
 *
 * Priority:
 * 1. Exact filename match
 * 2. Compound extension match
 * 3. Extension match
 * 4. MIME type match
 * 5. Generic file icon
 *
 * @param {Object} options
 * @param {string} [options.name] - Full filename (for exact matching)
 * @param {string} [options.extension] - File extension (without dot)
 * @param {string} [options.mimeType] - MIME type for fallback
 * @returns {IconDef}
 */
export function resolveFileIcon({ name, extension, mimeType }) {
  // 1. Exact filename match
  if (name) {
    const lowerName = name.toLowerCase();
    if (EXACT_FILENAMES.has(lowerName)) {
      return EXACT_FILENAMES.get(lowerName);
    }
  }
  
  // 2. Compound extension match
  if (name) {
    const { compoundExt } = extractExtension(name);
    if (compoundExt && COMPOUND_EXTENSIONS.has(compoundExt)) {
      return COMPOUND_EXTENSIONS.get(compoundExt);
    }
  }
  
  // 3. Extension match
  if (extension) {
    const lowerExt = extension.toLowerCase();
    if (EXTENSIONS.has(lowerExt)) {
      return EXTENSIONS.get(lowerExt);
    }
  }
  
  // 4. MIME type match
  if (mimeType) {
    const lowerMime = mimeType.toLowerCase().split(';')[0].trim();
    if (MIME_TYPES.has(lowerMime)) {
      return MIME_TYPES.get(lowerMime);
    }
  }
  
  // 5. Generic fallback
  return { icon: RiFileLine, color: COLORS.generic, label: 'File' };
}

/**
 * Resolve icon for a folder/directory
 *
 * @param {Object} options
 * @param {string} [options.name] - Folder name
 * @param {boolean} [options.isOpen=false] - Whether folder is expanded/open
 * @param {boolean} [options.isHidden=false] - Whether folder is hidden (starts with .)
 * @returns {IconDef}
 */
export function resolveFolderIcon({ name, isOpen = false, isHidden = false }) {
  // Hidden folders
  if (isHidden || (name && name.startsWith('.'))) {
    return { icon: RiFolderLockLine, color: '#6B7280', label: 'Hidden Folder' };
  }
  
  // Special folder names
  if (name) {
    const lowerName = name.toLowerCase();
    if (SPECIAL_FOLDERS.has(lowerName)) {
      return SPECIAL_FOLDERS.get(lowerName);
    }
  }
  
  // Open/closed state
  if (isOpen) {
    return { icon: RiFolderOpenLine, color: COLORS.folder, label: 'Open Folder' };
  }
  
  // Default folder
  return { icon: RiFolderLine, color: COLORS.folder, label: 'Folder' };
}

/**
 * Get all supported file types (for documentation/testing)
 * @returns {string[]}
 */
export function getSupportedExtensions() {
  return Array.from(EXTENSIONS.keys()).sort();
}

/**
 * Get all exact filename matches (for documentation/testing)
 * @returns {string[]}
 */
export function getExactFilenames() {
  return Array.from(EXACT_FILENAMES.keys()).sort();
}
