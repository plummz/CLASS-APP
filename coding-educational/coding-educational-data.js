const codingEducationalData = (function () {
  'use strict';

  const img = {
    programming: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80',
    frontend: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    backend: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
    database: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=1200&q=80',
    deploy: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    git: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?auto=format&fit=crop&w=1200&q=80',
    cyber: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
    network: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80',
    linux: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=1200&q=80',
    api: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    mobile: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=80',
    ux: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?auto=format&fit=crop&w=1200&q=80',
    engineering: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
    cloud: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    testing: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    dsa: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&w=1200&q=80',
  };

  const source = {
    oracle: { name: 'Oracle Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/' },
    mdn: { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
    python: { name: 'Python Official Documentation', url: 'https://docs.python.org/3/' },
    git: { name: 'Git Documentation', url: 'https://git-scm.com/doc' },
    owasp: { name: 'OWASP Foundation', url: 'https://owasp.org/www-project-top-ten/' },
    postgres: { name: 'PostgreSQL Documentation', url: 'https://www.postgresql.org/docs/' },
    php: { name: 'PHP Manual', url: 'https://www.php.net/manual/en/' },
    ruby: { name: 'Ruby Documentation', url: 'https://www.ruby-lang.org/en/documentation/' },
    cpp: { name: 'cppreference', url: 'https://en.cppreference.com/' },
    dotnet: { name: 'Microsoft C# Documentation', url: 'https://learn.microsoft.com/dotnet/csharp/' },
    typescript: { name: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/' },
    docker: { name: 'Docker Documentation', url: 'https://docs.docker.com/' },
    android: { name: 'Android Developers', url: 'https://developer.android.com/docs' },
    ux: { name: 'Nielsen Norman Group', url: 'https://www.nngroup.com/articles/' },
    cloud: { name: 'AWS Cloud Concepts', url: 'https://aws.amazon.com/what-is-cloud-computing/' },
    testing: { name: 'ISTQB Glossary', url: 'https://glossary.istqb.org/' },
    linux: { name: 'Linux Foundation Resources', url: 'https://www.linuxfoundation.org/resources/' },
  };

  function id(value) {
    return String(value).toLowerCase().replace(/c\+\+/g, 'cpp').replace(/c#/g, 'csharp').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function lesson(prefix, title, summary, keyPoints, code, recap, sources, tags = []) {
    return {
      id: id(`${prefix}-${title}`),
      title,
      readingTime: `${Math.max(4, Math.min(8, Math.ceil((summary.length + keyPoints.join('').length) / 160)))} min`,
      tags: ['Beginner', ...tags],
      summary,
      keyPoints,
      example: {
        title: `${title} Example`,
        code,
      },
      recap,
      sources,
    };
  }

  function makeQuiz(chapterId, lessons) {
    const usable = lessons.slice(0, 5);
    return usable.map((item, index) => ({
      id: `${chapterId}-q${index + 1}`,
      question: `Which idea best matches "${item.title}"?`,
      choices: [
        item.recap,
        'It is only used by advanced developers and should be skipped by beginners.',
        'It is unrelated to building software projects.',
        'It is a visual design choice only.',
      ],
      answerIndex: 0,
    }));
  }

  function chapter(title, description, lessons) {
    const chapterId = id(title);
    return {
      id: chapterId,
      title,
      description,
      level: 'Beginner',
      lessons,
      quiz: makeQuiz(chapterId, lessons),
    };
  }

  function buildBookChapters(title, lessons) {
    if (lessons.length <= 5) {
      return [chapter(`${title} Foundations`, `Start with the essential ideas in ${title}.`, lessons)];
    }
    const midpoint = Math.ceil(lessons.length / 2);
    return [
      chapter(`${title} Foundations`, `Start with the essential ideas in ${title}.`, lessons.slice(0, midpoint)),
      chapter(`${title} Guided Workbook`, `Continue with more ${title} lessons and guided examples.`, lessons.slice(midpoint)),
    ];
  }

  function subfolder(title, description, image, lessons, level = 'Beginner') {
    return { id: id(title), title, description, level, image, chapters: buildBookChapters(title, lessons) };
  }

  function category(title, description, image, subfolders, level = 'Beginner') {
    return { id: id(title), title, description, level, image, subfolders };
  }

  function simpleLessons(prefix, tag, titles, sources, code, topic) {
    return titles.map((title) => lesson(
      prefix,
      title,
      `${title} is a beginner topic in ${topic}. It helps you understand how real projects are organized and how small correct steps become working software.`,
      [
        `${title} should be learned through small examples first.`,
        'Good naming and clear structure make code easier to read.',
        'Practice by changing one part, running it, and checking the result.',
      ],
      code,
      `${title} is part of the foundation you need before building larger apps.`,
      sources,
      [tag]
    ));
  }

  const javaLessons = [
    lesson('java', 'Introduction to Java',
      'Java is a programming language used for desktop apps, backend systems, Android development, and school programming exercises. Java code is compiled and then runs on the Java Virtual Machine, which helps it work on many systems.',
      ['Java is object-oriented.', 'Java programs usually start from a class.', 'The main method is the entry point of a basic Java program.'],
      'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, world!");\n  }\n}',
      'Java is a flexible language. Start with simple output, then slowly add variables, decisions, loops, and classes.',
      [source.oracle], ['Java']),
    lesson('java', 'Data Types',
      'Data types tell Java what kind of value a variable can store. Choosing the right type helps the program use memory and operations correctly.',
      ['int stores whole numbers.', 'double stores decimal numbers.', 'char stores one character.', 'boolean stores true or false.'],
      "int age = 19;\ndouble grade = 95.5;\nchar section = 'A';\nboolean passed = true;",
      'Use a data type that matches the value you need to store.',
      [source.oracle], ['Java']),
    lesson('java', 'Variables',
      'A variable is a named storage space for a value. In Java, you declare the type first, then the variable name.',
      ['Variables need a type.', 'Use meaningful names.', 'A variable value can change unless it is final.'],
      'String studentName = "Mika";\nint score = 88;\nscore = 92;',
      'Variables make programs remember values and reuse them later.',
      [source.oracle], ['Java']),
    lesson('java', 'Operators',
      'Operators are symbols that perform actions on values, such as math, comparison, or logic.',
      ['+ adds values or joins text.', '== compares equality.', '&& means both conditions must be true.'],
      'int total = 10 + 5;\nboolean passed = total >= 15;',
      'Operators let your program calculate and compare values.',
      [source.oracle], ['Java']),
    lesson('java', 'Conditions',
      'Conditions let Java choose what code to run based on true or false checks.',
      ['if runs code when a condition is true.', 'else runs an alternate path.', 'else if checks another condition.'],
      'int grade = 85;\nif (grade >= 75) {\n  System.out.println("Passed");\n} else {\n  System.out.println("Try again");\n}',
      'Conditions help programs make decisions.',
      [source.oracle], ['Java']),
    lesson('java', 'Loops',
      'Loops repeat code without copying the same lines many times.',
      ['for loops are useful when you know the count.', 'while loops repeat while a condition is true.', 'Avoid infinite loops by updating the condition.'],
      'for (int i = 1; i <= 3; i++) {\n  System.out.println(i);\n}',
      'Loops are best for repeated tasks like counting, listing, and searching.',
      [source.oracle], ['Java']),
    lesson('java', 'Methods',
      'Methods group instructions under one name so you can reuse them.',
      ['A method can receive parameters.', 'A method can return a value.', 'Methods keep code organized.'],
      'static int add(int a, int b) {\n  return a + b;\n}',
      'Methods make programs easier to read, test, and reuse.',
      [source.oracle], ['Java']),
    lesson('java', 'Arrays',
      'An array stores multiple values of the same type in one variable.',
      ['Array indexes start at 0.', 'Arrays have a fixed length.', 'Use loops to read many array items.'],
      'int[] scores = {90, 85, 92};\nSystem.out.println(scores[0]);',
      'Arrays are useful when many related values belong together.',
      [source.oracle], ['Java']),
    lesson('java', 'OOP',
      'Object-oriented programming organizes code using classes and objects. A class is like a blueprint, while an object is a real item made from that blueprint.',
      ['Classes describe data and behavior.', 'Objects are created from classes.', 'Fields store object data and methods define actions.'],
      'class Student {\n  String name;\n  void greet() {\n    System.out.println("Hi " + name);\n  }\n}',
      'OOP helps organize larger programs into meaningful parts.',
      [source.oracle], ['Java', 'OOP']),
    lesson('java', 'Swing',
      'Java Swing is a toolkit for building basic desktop graphical interfaces with windows, labels, buttons, and text fields.',
      ['JFrame is a window.', 'JButton creates a clickable button.', 'Swing apps need event listeners for actions.'],
      'JFrame frame = new JFrame("Demo");\nJButton button = new JButton("Click");\nframe.add(button);\nframe.pack();',
      'Swing is useful for learning GUI structure, even when server environments cannot display windows.',
      [source.oracle], ['Java', 'Swing']),
  ];

  const htmlLessons = [
    ['Introduction', 'HTML gives structure to a webpage. It tells the browser what content exists, such as headings, paragraphs, links, images, and forms.', ['HTML is markup, not a programming language.', 'Tags describe page parts.', 'Browsers read HTML to build the page structure.'], '<!doctype html>\n<html>\n  <body>Hello HTML</body>\n</html>', 'HTML is the skeleton of a webpage.'],
    ['Elements', 'An HTML element usually has an opening tag, content, and a closing tag.', ['Elements can contain text.', 'Elements can be nested.', 'Some elements are self-closing or void elements.'], '<p>This is a paragraph element.</p>', 'Elements are the basic building blocks of HTML.'],
    ['Headings', 'Headings organize a page into titles and sections.', ['h1 is usually the main page title.', 'Use headings in order when possible.', 'Headings help readers and assistive tools.'], '<h1>Main Title</h1>\n<h2>Section Title</h2>', 'Headings make content easier to scan.'],
    ['Paragraphs', 'Paragraphs hold normal blocks of text.', ['Use p for readable text sections.', 'Do not use paragraphs only for spacing.', 'CSS should handle visual spacing.'], '<p>This lesson is for beginners.</p>', 'Paragraphs are for readable content.'],
    ['Links', 'Links let users move to another page, section, or resource.', ['a creates a link.', 'href stores the destination.', 'Link text should describe where it goes.'], '<a href="https://developer.mozilla.org/">Visit MDN</a>', 'Links connect pages and resources.'],
    ['Images', 'Images add visual information to a page.', ['img uses src for the file path.', 'alt explains the image.', 'Use images that support the content.'], '<img src="photo.jpg" alt="Student coding">', 'Images need clear alt text for accessibility.'],
    ['Lists', 'Lists organize related items.', ['ul creates unordered lists.', 'ol creates numbered lists.', 'li is each list item.'], '<ul>\n  <li>HTML</li>\n  <li>CSS</li>\n</ul>', 'Lists make grouped information neat.'],
    ['Tables', 'Tables show data in rows and columns.', ['table wraps the data.', 'tr is a row.', 'th and td are header and data cells.'], '<table>\n  <tr><th>Name</th><th>Score</th></tr>\n  <tr><td>Ana</td><td>95</td></tr>\n</table>', 'Tables are for tabular data, not page layout.'],
    ['Forms', 'Forms collect user input.', ['input collects short values.', 'label explains an input.', 'button submits or triggers actions.'], '<label>Name <input name="name"></label>\n<button>Save</button>', 'Forms are how users send data.'],
    ['Semantic HTML', 'Semantic HTML uses tags that describe meaning, like header, main, section, and footer.', ['Semantic tags improve structure.', 'They help accessibility.', 'They make code easier to understand.'], '<main>\n  <section>\n    <h2>Lessons</h2>\n  </section>\n</main>', 'Semantic HTML makes pages clearer for people and tools.'],
  ].map(([title, summary, points, code, recap]) => lesson('html', title, summary, points, code, recap, [source.mdn], ['HTML']));

  const cssLessons = [
    ['Introduction', 'CSS controls the appearance of HTML. It handles colors, spacing, layout, borders, and animation.', ['CSS separates style from structure.', 'Selectors choose what to style.', 'Rules contain properties and values.'], 'p {\n  color: blue;\n}', 'CSS makes webpages readable and visually organized.'],
    ['Selectors', 'Selectors tell CSS which HTML elements to style.', ['Element selectors target tag names.', 'Class selectors start with a dot.', 'ID selectors start with #.'], '.card {\n  padding: 16px;\n}', 'Selectors connect CSS rules to HTML elements.'],
    ['Colors', 'CSS colors can use names, hex values, rgb, hsl, and variables.', ['Use enough contrast.', 'Keep palettes consistent.', 'Variables help reuse colors.'], ':root {\n  --accent: #00d4ff;\n}', 'Good color choices improve readability.'],
    ['Box Model', 'The box model describes content, padding, border, and margin.', ['Content is the inner area.', 'Padding is inside spacing.', 'Margin is outside spacing.'], '.box {\n  padding: 12px;\n  margin: 10px;\n}', 'The box model explains how elements take space.'],
    ['Padding/Margin', 'Padding creates space inside an element, while margin creates space outside it.', ['Padding affects the inside feel.', 'Margin separates elements.', 'Use consistent spacing.'], '.button {\n  padding: 10px 14px;\n  margin-top: 12px;\n}', 'Spacing makes layouts calmer and easier to read.'],
    ['Flexbox', 'Flexbox arranges items in one direction, either row or column.', ['display:flex enables it.', 'gap creates space between items.', 'justify-content and align-items control alignment.'], '.row {\n  display: flex;\n  gap: 12px;\n}', 'Flexbox is great for toolbars, cards, and centered content.'],
    ['Grid', 'CSS Grid arranges content in rows and columns.', ['Grid is useful for card layouts.', 'repeat() avoids repeated column code.', 'gap controls spacing.'], '.grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n}', 'Grid helps build clean two-dimensional layouts.'],
    ['Responsive Design', 'Responsive design makes pages work on different screen sizes.', ['Use flexible widths.', 'Use media queries only when needed.', 'Test on mobile and desktop.'], '@media (max-width: 600px) {\n  .grid { grid-template-columns: 1fr; }\n}', 'Responsive pages adapt instead of breaking.'],
    ['Animations', 'Animations show movement and feedback when used carefully.', ['Keep animations short.', 'Use transitions for hover or press feedback.', 'Avoid motion that distracts.'], '.button {\n  transition: transform 120ms ease;\n}\n.button:active {\n  transform: scale(.96);\n}', 'Good animation makes interfaces feel responsive.'],
  ].map(([title, summary, points, code, recap]) => lesson('css', title, summary, points, code, recap, [source.mdn], ['CSS']));

  const jsLessons = [
    ['Introduction', 'JavaScript adds behavior to webpages. It can update content, react to clicks, validate forms, and talk to APIs.', ['JavaScript runs in browsers.', 'It can change the DOM.', 'It is also used on servers with Node.js.'], 'console.log("Hello JavaScript");', 'JavaScript makes webpages interactive.'],
    ['Variables', 'Variables store values so a program can use them later.', ['let is used for changeable values.', 'const is used when reassignment is not needed.', 'Use clear names.'], 'const name = "Ana";\nlet score = 90;', 'Variables help programs remember information.'],
    ['Data Types', 'JavaScript values can be strings, numbers, booleans, arrays, objects, null, or undefined.', ['Strings store text.', 'Numbers store numeric values.', 'Booleans store true or false.'], 'const passed = true;\nconst grade = 95;', 'Knowing data types helps avoid confusing bugs.'],
    ['Operators', 'Operators perform actions like math, comparison, and logic.', ['+ can add or join strings.', '=== checks strict equality.', '&& means both conditions are true.'], 'const total = 10 + 5;\nconst passed = total >= 15;', 'Operators are small symbols that make decisions and calculations possible.'],
    ['Functions', 'Functions group reusable instructions.', ['Functions can receive parameters.', 'Functions can return values.', 'Use functions to avoid repeated code.'], 'function add(a, b) {\n  return a + b;\n}', 'Functions keep code organized.'],
    ['Arrays', 'Arrays store ordered lists of values.', ['Indexes start at 0.', 'push adds an item.', 'map and forEach help process items.'], 'const subjects = ["HTML", "CSS", "JS"];\nconsole.log(subjects[0]);', 'Arrays are useful for lists.'],
    ['Objects', 'Objects store related values using property names.', ['Objects use key-value pairs.', 'Use dot notation to read properties.', 'Objects model real things.'], 'const student = {\n  name: "Mika",\n  year: 1\n};', 'Objects group related data.'],
    ['DOM', 'The DOM is the browser representation of the HTML page. JavaScript can read and change it.', ['querySelector finds elements.', 'textContent changes text.', 'classList changes classes.'], 'document.querySelector("h1").textContent = "Updated";', 'DOM skills let you control page content.'],
    ['Events', 'Events happen when users click, type, scroll, or interact with a page.', ['addEventListener listens for events.', 'Click events are common.', 'Keep event code small and clear.'], 'button.addEventListener("click", () => {\n  console.log("Clicked");\n});', 'Events connect user actions to code.'],
    ['Conditions', 'Conditions let JavaScript choose between paths.', ['if checks a condition.', 'else handles the other path.', 'Use clear comparisons.'], 'if (score >= 75) {\n  console.log("Passed");\n}', 'Conditions make programs react to different situations.'],
    ['Loops', 'Loops repeat code while a condition or list still has work.', ['for loops use counters.', 'for...of reads arrays cleanly.', 'Avoid infinite loops.'], 'for (const item of subjects) {\n  console.log(item);\n}', 'Loops reduce repeated code.'],
  ].map(([title, summary, points, code, recap]) => lesson('javascript', title, summary, points, code, recap, [source.mdn], ['JavaScript']));

  const pythonLessons = [
    ['Introduction', 'Python is a beginner-friendly programming language used for automation, web apps, data work, AI, and scripting.', ['Python uses indentation.', 'It has readable syntax.', 'It is popular in schools and industry.'], 'print("Hello, Python!")', 'Python is a good first language because the code is easy to read.'],
    ['Variables', 'Python variables store values without writing the type first.', ['Names should be clear.', 'Values can change.', 'Python detects the type from the value.'], 'name = "Ana"\nage = 19', 'Python variables are quick to write and easy to read.'],
    ['Data Types', 'Python has strings, integers, floats, booleans, lists, dictionaries, and more.', ['str stores text.', 'int stores whole numbers.', 'bool stores True or False.'], 'grade = 95.5\npassed = True', 'Data types describe what kind of value you are using.'],
    ['Input/Output', 'Input lets users type values, and output shows results.', ['input() reads text.', 'print() displays output.', 'Convert input when you need numbers.'], 'name = input("Name: ")\nprint("Hello", name)', 'Input and output make programs interactive.'],
    ['Conditions', 'Python conditions use if, elif, and else.', ['Indentation matters.', 'Use comparison operators.', 'elif checks another case.'], 'if grade >= 75:\n    print("Passed")\nelse:\n    print("Try again")', 'Conditions let Python make decisions.'],
    ['Loops', 'Loops repeat work for lists or while a condition is true.', ['for is common with lists.', 'while repeats while true.', 'Update loop values carefully.'], 'for number in range(1, 4):\n    print(number)', 'Loops save time when tasks repeat.'],
    ['Functions', 'Functions group code under one name.', ['def creates a function.', 'Parameters receive values.', 'return sends a result back.'], 'def add(a, b):\n    return a + b', 'Functions make code reusable.'],
    ['Lists', 'Lists store multiple values in order.', ['Indexes start at 0.', 'append adds an item.', 'Loops can read each item.'], 'subjects = ["HTML", "CSS", "Python"]\nsubjects.append("Java")', 'Lists are useful for collections.'],
    ['Dictionaries', 'Dictionaries store values by key.', ['Keys describe values.', 'Use square brackets to read a key.', 'They are useful for records.'], 'student = {"name": "Mika", "year": 1}\nprint(student["name"])', 'Dictionaries group named information.'],
    ['OOP basics', 'Object-oriented programming in Python uses classes and objects to organize data and behavior.', ['class creates a blueprint.', 'self refers to the object.', 'Methods are functions inside classes.'], 'class Student:\n    def __init__(self, name):\n        self.name = name', 'OOP helps organize larger Python programs.'],
  ].map(([title, summary, points, code, recap]) => lesson('python', title, summary, points, code, recap, [source.python], ['Python']));

  const gitBasics = [
    ['What is Git', 'Git tracks project changes so you can save work, compare versions, and recover from mistakes.', ['Git works inside a repository.', 'It saves snapshots called commits.', 'It helps teams collaborate safely.'], 'git status', 'Git is a safety net for your code.'],
    ['Repository', 'A repository is a project folder that Git is tracking.', ['It contains your files.', 'Git stores history in a hidden .git folder.', 'Use one repository per project.'], 'git init', 'A repository is where version control begins.'],
    ['Commit', 'A commit is a saved snapshot of your changes with a message.', ['Commits should be focused.', 'Messages should describe the change.', 'You can inspect commit history later.'], 'git add index.html\ngit commit -m "add homepage"', 'Commits make progress traceable.'],
    ['Push and Pull', 'Push sends commits to a remote repository. Pull downloads changes from the remote.', ['Push shares your work.', 'Pull gets team updates.', 'Pull before pushing when collaborating.'], 'git pull origin main\ngit push origin main', 'Push and pull keep local and remote work connected.'],
    ['Branches', 'Branches let you work on changes separately before merging them.', ['main usually holds stable code.', 'Feature branches isolate work.', 'Merge when the feature is ready.'], 'git switch -c feature-login', 'Branches reduce risk while building features.'],
  ].map(([title, summary, points, code, recap]) => lesson('git-basics', title, summary, points, code, recap, [source.git], ['Git']));

  const cybersecurityBasics = [
    ['What is Cybersecurity', 'Cybersecurity protects systems, accounts, data, and users from harm or misuse.', ['It includes prevention, detection, and response.', 'Human habits matter.', 'Security should be built into apps early.'], 'Use strong passwords and update software regularly.', 'Cybersecurity is about reducing risk.'],
    ['CIA Triad', 'The CIA triad means confidentiality, integrity, and availability.', ['Confidentiality protects private data.', 'Integrity keeps data correct.', 'Availability keeps systems usable.'], 'A school portal should keep grades private, correct, and available.', 'CIA helps explain the goals of security.'],
    ['Password Safety', 'Password safety means using strong, unique passwords and extra verification when possible.', ['Do not reuse passwords.', 'Use MFA when available.', 'Never store plain-text passwords.'], 'Use a password manager to create unique passwords.', 'Strong account habits prevent many attacks.'],
    ['Phishing Awareness', 'Phishing tricks users into giving information through fake messages, links, or pages.', ['Check the sender.', 'Do not rush urgent messages.', 'Avoid opening suspicious links.'], 'If a message asks for your password, verify through an official channel.', 'Slowing down helps you avoid phishing.'],
    ['Secure Coding Basics', 'Secure coding means writing code that handles input, errors, and access carefully.', ['Validate input.', 'Escape output when showing user text.', 'Check permissions on the server.'], 'if (!currentUser) return res.status(401).json({ error: "Login required" });', 'Secure coding protects users and data.'],
  ].map(([title, summary, points, code, recap]) => lesson('cybersecurity-basics', title, summary, points, code, recap, [source.owasp], ['Cybersecurity']));

  const sqlBasics = [
    ['What is SQL', 'SQL is a language used to work with relational databases. It can read, add, update, and delete records.', ['SQL works with tables.', 'Rows are records.', 'Columns are fields.'], 'SELECT * FROM students;', 'SQL helps apps talk to databases.'],
    ['SELECT', 'SELECT reads data from a table.', ['Choose columns instead of always using *.', 'WHERE filters results.', 'ORDER BY sorts results.'], 'SELECT name, course\nFROM students\nWHERE year_level = 1;', 'SELECT is the main command for reading data.'],
    ['INSERT', 'INSERT adds a new row to a table.', ['List the columns.', 'Provide matching values.', 'Validate data before inserting.'], "INSERT INTO students (name, course)\nVALUES ('Ana', 'BSIT');", 'INSERT stores new records.'],
    ['UPDATE', 'UPDATE changes existing rows.', ['Use WHERE to avoid updating every row.', 'Update only needed columns.', 'Check the target record first.'], "UPDATE students\nSET course = 'BSIT'\nWHERE id = 1;", 'UPDATE edits existing data.'],
    ['DELETE', 'DELETE removes rows from a table.', ['Use WHERE carefully.', 'Backups are important.', 'Some apps use soft delete instead.'], 'DELETE FROM students\nWHERE id = 1;', 'DELETE should be used carefully because it removes data.'],
    ['Keys and Relationships', 'Keys connect tables and keep records organized.', ['Primary keys identify rows.', 'Foreign keys refer to another table.', 'Relationships reduce repeated data.'], 'CREATE TABLE enrollments (\n  student_id INT,\n  subject_id INT\n);', 'Keys help databases model real information.'],
  ].map(([title, summary, points, code, recap]) => lesson('sql-basics', title, summary, points, code, recap, [source.postgres], ['SQL', 'Database']));

  const languageShort = {
    Ruby: [source.ruby, 'puts "Hello, Ruby!"'],
    PHP: [source.php, '<?php echo "Hello, PHP!"; ?>'],
    SQL: [source.postgres, 'SELECT title FROM lessons;'],
    C: [source.cpp, '#include <stdio.h>\nint main(void) { printf("Hello C"); return 0; }'],
    'C++': [source.cpp, '#include <iostream>\nint main() { std::cout << "Hello C++"; }'],
    'C#': [source.dotnet, 'Console.WriteLine("Hello C#");'],
    TypeScript: [source.typescript, 'let score: number = 95;'],
  };

  const programmingSubfolders = [
    subfolder('Java', 'Learn Java basics, object-oriented programming, and GUI concepts.', img.programming, javaLessons),
    subfolder('HTML', 'Learn the structure of webpages.', img.frontend, htmlLessons),
    subfolder('CSS', 'Learn how to style webpages clearly and responsively.', img.frontend, cssLessons),
    subfolder('JavaScript', 'Learn browser programming and basic app logic.', img.frontend, jsLessons),
    subfolder('Python', 'Learn readable programming syntax for scripts, apps, and data work.', img.programming, pythonLessons),
    ...Object.entries(languageShort).map(([name, [src, code]]) => subfolder(name, `Beginner ${name} concepts and short examples.`, img.programming, simpleLessons(id(name), name, ['Introduction', 'Variables', 'Data Types', 'Conditions', 'Loops'], [src], code, name))),
  ];

  return [
    category('Programming Languages', 'Learn the core languages used in software and web development.', img.programming, programmingSubfolders),
    category('Front End', 'Build the visible part of websites with structure, style, and interaction.', img.frontend, [
      subfolder('Web Basics', 'How browsers, HTML, CSS, and JavaScript work together.', img.frontend, simpleLessons('web-basics', 'Front End', ['How Web Pages Load', 'HTML CSS JS Roles', 'Browser DevTools'], [source.mdn], '<script src="app.js"></script>', 'front-end development')),
      subfolder('Responsive Design', 'Make layouts work on phones, tablets, and desktops.', img.frontend, simpleLessons('responsive-design', 'Responsive', ['Flexible Layouts', 'Media Queries', 'Mobile First'], [source.mdn], '@media (max-width: 600px) { .card { width: 100%; } }', 'responsive design')),
      subfolder('DOM Manipulation', 'Use JavaScript to read and update page content.', img.frontend, simpleLessons('dom-manipulation', 'DOM', ['Selecting Elements', 'Changing Text', 'Toggling Classes'], [source.mdn], 'document.querySelector(".title").textContent = "Hi";', 'DOM manipulation')),
      subfolder('React Basics', 'Understand components, props, and state at a beginner level.', img.frontend, simpleLessons('react-basics', 'React', ['Components', 'Props', 'State'], [source.mdn], 'function Card(props) { return <h2>{props.title}</h2>; }', 'React basics')),
      subfolder('UI Components', 'Reusable buttons, cards, inputs, and panels.', img.ux, simpleLessons('ui-components', 'UI', ['Buttons', 'Cards', 'Forms'], [source.ux], '<button class="primary">Save</button>', 'UI components')),
    ]),
    category('Back End', 'Understand servers, routes, data validation, and secure app logic.', img.backend, [
      subfolder('Server Basics', 'Requests, responses, routes, and server responsibilities.', img.backend, simpleLessons('server-basics', 'Back End', ['Requests and Responses', 'Routes', 'Middleware'], [source.mdn], 'app.get("/api/status", (req, res) => res.json({ ok: true }));', 'server development')),
      subfolder('APIs', 'Build endpoints that apps can use.', img.api, simpleLessons('backend-apis', 'API', ['Endpoints', 'JSON Responses', 'Status Codes'], [source.mdn], 'res.status(201).json({ saved: true });', 'backend APIs')),
      subfolder('Authentication Basics', 'Login, sessions, and permission checks.', img.cyber, simpleLessons('auth-basics', 'Auth', ['Login Flow', 'Sessions', 'Authorization'], [source.owasp], 'if (!user) return res.status(401).send("Login required");', 'authentication')),
      subfolder('Node.js Basics', 'Run JavaScript on the server.', img.backend, simpleLessons('node-basics', 'Node.js', ['Node Runtime', 'npm Packages', 'Express Basics'], [source.mdn], 'console.log("Server starting");', 'Node.js')),
      subfolder('Database Connection Basics', 'Connect server code to stored data.', img.database, simpleLessons('db-connection-basics', 'Database', ['Connection Strings', 'Queries', 'Error Handling'], [source.postgres], 'const rows = await db.query("SELECT * FROM users");', 'database connections')),
    ]),
    category('Databases', 'Store, query, and protect app data.', img.database, [
      subfolder('Database Basics', 'Tables, rows, columns, and records.', img.database, simpleLessons('database-basics', 'Database', ['Tables', 'Rows', 'Columns'], [source.postgres], 'CREATE TABLE students (id INT, name TEXT);', 'database basics')),
      subfolder('SQL Basics', 'Read and change records with SQL.', img.database, sqlBasics),
      subfolder('Tables and Records', 'Organize data into useful table structures.', img.database, simpleLessons('tables-records', 'Database', ['Table Design', 'Records', 'Columns'], [source.postgres], 'CREATE TABLE lessons (id SERIAL PRIMARY KEY, title TEXT);', 'tables and records')),
      subfolder('CRUD Operations', 'Create, read, update, and delete data.', img.database, simpleLessons('crud-operations', 'CRUD', ['Create', 'Read', 'Update', 'Delete'], [source.postgres], 'SELECT * FROM lessons;', 'CRUD')),
      subfolder('Keys and Relationships', 'Connect records using primary and foreign keys.', img.database, simpleLessons('keys-relationships', 'Database', ['Primary Keys', 'Foreign Keys', 'Relationships'], [source.postgres], 'FOREIGN KEY (user_id) REFERENCES users(id)', 'database relationships')),
    ]),
    category('Deployment Sites / Programs', 'Move a project from your computer to the internet.', img.deploy, ['GitHub','GitHub Pages','Netlify','Vercel','Render','Firebase','Supabase Basics'].map((name) => subfolder(name, `Beginner deployment notes for ${name}.`, img.deploy, simpleLessons(id(name), 'Deployment', ['Purpose', 'Setup Idea', 'Common Mistakes'], [source.git, source.docker], 'npm run build\nnpm start', name)))),
    category('Version Control', 'Track changes, collaborate, and recover safely.', img.git, [
      subfolder('Git Basics', 'Start tracking project changes safely.', img.git, gitBasics),
      ...['Repositories','Commit / Push / Pull','Branches','Merge Basics'].map((name) => subfolder(name, `${name} for beginner collaboration.`, img.git, simpleLessons(id(name), 'Git', ['Concept', 'Command', 'Practice Tip'], [source.git], 'git status', name))),
    ]),
    category('IT / Cybersecurity', 'Learn safe habits, common risks, and basic defense thinking.', img.cyber, [
      subfolder('Cybersecurity Basics', 'Understand security goals and everyday risks.', img.cyber, cybersecurityBasics),
      ...['Password Safety','Phishing Awareness','Secure Coding Basics','OWASP Basics'].map((name) => subfolder(name, `${name} explained for students.`, img.cyber, simpleLessons(id(name), 'Cybersecurity', ['Risk', 'Safe Habit', 'Example'], [source.owasp], 'Validate input before using it.', name))),
    ]),
    category('Networking Basics', 'Understand how devices and web apps communicate.', img.network, ['Internet Basics','IP Address','DNS','Routers and Switches','Client and Server'].map((name) => subfolder(name, `${name} in simple networking terms.`, img.network, simpleLessons(id(name), 'Networking', ['Role', 'Use', 'Troubleshooting'], [source.mdn, source.linux], 'ping example.com', name)))),
    category('Operating Systems / Linux Basics', 'Learn files, processes, permissions, and terminal habits.', img.linux, ['OS Basics','Command Line Basics','Files and Directories','Permissions','Basic Linux Commands'].map((name) => subfolder(name, `${name} for beginner system use.`, img.linux, simpleLessons(id(name), 'Linux', ['Concept', 'Command', 'Safety Tip'], [source.linux], 'pwd\nls\ncd Documents', name)))),
    category('APIs / Web Services', 'Connect apps through structured requests and responses.', img.api, ['What is an API','REST Basics','Request and Response','JSON Basics','API Testing Basics'].map((name) => subfolder(name, `${name} for web service beginners.`, img.api, simpleLessons(id(name), 'API', ['Endpoint', 'Data', 'Status'], [source.mdn], 'fetch("/api/items").then(r => r.json())', name)))),
    category('Mobile Development', 'Design and build apps for small touch screens.', img.mobile, ['Mobile App Basics','Android Basics','Cross-platform Basics'].map((name) => subfolder(name, `${name} for app development starters.`, img.mobile, simpleLessons(id(name), 'Mobile', ['Touch UI', 'Device Limits', 'Testing'], [source.android, source.mdn], 'button { min-height: 44px; }', name)))),
    category('UI / UX Basics', 'Make interfaces readable, useful, and comfortable.', img.ux, ['UI Basics','UX Basics','Layout Principles','Color and Typography','Accessibility Basics'].map((name) => subfolder(name, `${name} for usable interface design.`, img.ux, simpleLessons(id(name), 'UI/UX', ['Clarity', 'Feedback', 'Consistency'], [source.ux], 'Use clear labels and readable contrast.', name)))),
    category('Software Engineering Basics', 'Plan, structure, and maintain projects like a team.', img.engineering, ['SDLC','Debugging Basics','Testing Basics','Documentation','Clean Code Basics'].map((name) => subfolder(name, `${name} for project discipline.`, img.engineering, simpleLessons(id(name), 'Software Engineering', ['Plan', 'Build', 'Review'], [source.testing, source.git], 'Write one focused function at a time.', name)))),
    category('Cloud Basics', 'Understand hosted services, scaling, storage, and reliability.', img.cloud, ['What is Cloud Computing','Storage Basics','Hosting Basics','Backend Services Basics'].map((name) => subfolder(name, `${name} for cloud beginners.`, img.cloud, simpleLessons(id(name), 'Cloud', ['Service', 'Hosting', 'Reliability'], [source.cloud], 'A cloud service runs on provider-managed infrastructure.', name)))),
    category('Testing / Debugging', 'Find mistakes faster and prove features still work.', img.testing, ['Common Errors','Debugging Process','Console Logging','Basic Testing'].map((name) => subfolder(name, `${name} for finding and preventing bugs.`, img.testing, simpleLessons(id(name), 'Testing', ['Reproduce', 'Inspect', 'Verify'], [source.testing], 'console.log("value", value);', name)))),
    category('Data Structures and Algorithms Basics', 'Learn simple ways to organize data and solve problems.', img.dsa, ['Arrays','Strings','Searching','Sorting','Stack and Queue basics'].map((name) => subfolder(name, `${name} for beginner problem solving.`, img.dsa, simpleLessons(id(name), 'DSA', ['Data Shape', 'Steps', 'Practice'], [source.mdn], 'const found = items.find(item => item.id === targetId);', name)))),
  ];
})();

(function expandCodingEducationalLibrary() {
  'use strict';

  const sources = {
    mdn: { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
    oracle: { name: 'Oracle Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/' },
    python: { name: 'Python Official Documentation', url: 'https://docs.python.org/3/' },
    git: { name: 'Git Documentation', url: 'https://git-scm.com/doc' },
    owasp: { name: 'OWASP Foundation', url: 'https://owasp.org/www-project-top-ten/' },
    postgres: { name: 'PostgreSQL Documentation', url: 'https://www.postgresql.org/docs/' },
    linux: { name: 'Linux Foundation Resources', url: 'https://www.linuxfoundation.org/resources/' },
    cloud: { name: 'AWS Cloud Concepts', url: 'https://aws.amazon.com/what-is-cloud-computing/' },
  };

  function slug(value) {
    return String(value).toLowerCase().replace(/c\+\+/g, 'cpp').replace(/c#/g, 'csharp').replace(/[^a-z0-9+&|!<>=?:%#.-]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function sourceFor(title) {
    const lower = title.toLowerCase();
    if (lower.includes('java') && !lower.includes('javascript')) return [sources.oracle];
    if (lower.includes('python')) return [sources.python];
    if (lower.includes('sql') || lower.includes('database') || lower.includes('crud') || lower.includes('keys')) return [sources.postgres];
    if (lower.includes('git') || lower.includes('branch') || lower.includes('merge') || lower.includes('repositories')) return [sources.git];
    if (lower.includes('cyber') || lower.includes('password') || lower.includes('phishing') || lower.includes('owasp') || lower.includes('secure')) return [sources.owasp];
    if (lower.includes('linux') || lower.includes('command') || lower.includes('operating') || lower.includes('permissions')) return [sources.linux];
    if (lower.includes('cloud') || lower.includes('hosting') || lower.includes('storage') || lower.includes('render') || lower.includes('firebase') || lower.includes('supabase')) return [sources.cloud];
    return [sources.mdn];
  }

  function syntaxFor(moduleTitle, topic) {
    const m = moduleTitle.toLowerCase();
    const t = topic.toLowerCase();
    if (m.includes('java') && !m.includes('javascript')) return t.includes('method') ? 'returnType methodName(parameters) { ... }' : 'type name = value;';
    if (m.includes('html')) return t.includes('attribute') || ['id','class','href','src','alt','title','target','style'].some((x) => t.includes(x)) ? '<tag attribute="value">content</tag>' : '<tag>content</tag>';
    if (m.includes('css')) return 'selector { property: value; }';
    if (m.includes('javascript') || m.includes('typescript')) return 'const value = input;\nfunction action(value) { return value; }';
    if (m.includes('python')) return 'name = value\ndef action(value):\n    return value';
    if (m.includes('sql') || m.includes('database')) return 'SELECT column FROM table WHERE condition;';
    if (m.includes('git')) return 'git status\ngit add .\ngit commit -m "message"';
    if (m.includes('linux')) return 'pwd\nls\ncd folder';
    return `${moduleTitle} note: ${topic}\nObserve the input, the action taken, and the visible check.`;
  }

  function cssValue(topic) {
    const t = topic.toLowerCase();
    if (t.includes('background-color')) return 'background-color: #0f172a;';
    if (t.includes('background-image')) return 'background-image: linear-gradient(135deg, #0ea5e9, #22c55e);';
    if (t.includes('width') || t.includes('height')) return 'width: 240px;\n  height: 120px;';
    if (t.includes('margin')) return 'margin: 16px;';
    if (t.includes('padding')) return 'padding: 16px;';
    if (t.includes('border-radius')) return 'border-radius: 12px;';
    if (t.includes('border')) return 'border: 2px solid #38bdf8;';
    if (t.includes('font-size')) return 'font-size: 1.2rem;';
    if (t.includes('font-family')) return 'font-family: Arial, sans-serif;';
    if (t.includes('text-align')) return 'text-align: center;';
    if (t.includes('display')) return 'display: flex;';
    if (t.includes('position')) return 'position: relative;';
    if (t.includes('z-index')) return 'z-index: 10;';
    if (t.includes('overflow')) return 'overflow: hidden;';
    if (t.includes('opacity')) return 'opacity: 0.85;';
    if (t.includes('box-shadow')) return 'box-shadow: 0 12px 30px rgba(0,0,0,0.25);';
    if (t.includes('flex')) return 'display: flex;\n  justify-content: center;\n  align-items: center;';
    if (t.includes('grid')) return 'display: grid;\n  grid-template-columns: repeat(3, 1fr);';
    return 'color: #0ea5e9;';
  }

  function codeFor(moduleTitle, topic) {
    const safe = topic.replace(/["`]/g, '').replace(/\s+/g, ' ').trim();
    const m = moduleTitle.toLowerCase();
    if (m.includes('java') && !m.includes('javascript')) return `public class Main {\n  public static void main(String[] args) {\n    System.out.println("${safe}");\n  }\n}`;
    if (m.includes('html')) return `<section class="lesson">\n  <h1>${safe}</h1>\n  <p>This page demonstrates ${safe}.</p>\n</section>`;
    if (m.includes('css')) return `.lesson {\n  ${cssValue(topic)}\n}`;
    if (m.includes('javascript') || m.includes('typescript')) return `const topic = "${safe}";\nconsole.log(topic);`;
    if (m.includes('python')) return `topic = "${safe}"\nprint(topic)`;
    if (m.includes('sql') || m.includes('database')) return `SELECT '${safe}' AS topic;`;
    if (m.includes('git')) return `git status\ngit add .\ngit commit -m "practice ${safe}"`;
    if (m.includes('linux')) return `pwd\nls\nmkdir ${slug(safe)}`;
    if (m.includes('api')) return `fetch('/api/${slug(safe)}')\n  .then(response => response.json())\n  .then(data => console.log(data));`;
    return `Guided task: ${safe}\nCheck: explain the result`;
  }

  function resultFor(moduleTitle, topic) {
    const m = moduleTitle.toLowerCase();
    if (m.includes('css')) return `The preview shows the element with a specific ${topic} difference, such as changed spacing, color, size, alignment, or layering.`;
    if (m.includes('html')) return `The browser creates real page content for ${topic}, so the heading, text, media, link, or form control appears in the preview.`;
    if (m.includes('sql') || m.includes('database')) return `A small result table is returned for ${topic}.`;
    if (m.includes('git') || m.includes('linux')) return `The terminal shows status or file information related to ${topic}.`;
    return `The check confirms how ${topic} affects this ${moduleTitle} task.`;
  }

  function item(name, explanation, example, output) {
    return { item: name, explanation, syntax: name, example: example || '', output: output || '' };
  }

  function kindFor(moduleTitle) {
    const m = moduleTitle.toLowerCase();
    if (m.includes('html')) return 'html';
    if (m.includes('css')) return 'css';
    if (m.includes('javascript') || m.includes('typescript')) return 'javascript';
    if (m.includes('java') && !m.includes('javascript')) return 'java';
    if (m.includes('python')) return 'python';
    if (m.includes('sql') || m.includes('database')) return 'sql';
    return 'terminal';
  }

  function lessonTerms(moduleTitle, chapterTitle, topic) {
    const m = moduleTitle.toLowerCase();
    if (m.includes('cyber') || m.includes('password') || m.includes('phishing') || m.includes('owasp') || m.includes('secure')) {
      return [
        { term: 'Asset', definition: 'Something worth protecting, such as an account, file, device, database, or private message.' },
        { term: 'Threat', definition: 'A possible way something can go wrong, such as a fake login page or leaked password.' },
        { term: 'Control', definition: 'A safety step that lowers risk, such as MFA, validation, permission checks, or user training.' },
      ];
    }
    if (m.includes('network') || m.includes('internet') || m.includes('dns') || m.includes('router') || m.includes('client')) {
      return [
        { term: 'Host', definition: 'A device or service that sends, receives, or stores data on a network.' },
        { term: 'Address', definition: 'A value used to find a device, website, or service, such as an IP address or domain name.' },
        { term: 'Packet', definition: 'A small piece of data that travels across a network.' },
      ];
    }
    if (m.includes('cloud') || m.includes('hosting') || m.includes('storage') || m.includes('render') || m.includes('firebase') || m.includes('supabase')) {
      return [
        { term: 'Service', definition: 'A provider-managed tool your app can use, such as hosting, storage, database, logs, or authentication.' },
        { term: 'Region', definition: 'The physical area where cloud resources run, which can affect speed and reliability.' },
        { term: 'Scaling', definition: 'Changing resources so an app can handle more or fewer users.' },
      ];
    }
    if (m.includes('git') || m.includes('github') || m.includes('branch') || m.includes('merge')) {
      return [
        { term: 'Snapshot', definition: 'A saved version of project changes, usually created with a commit.' },
        { term: 'Remote', definition: 'A copy of the repository hosted online, such as on GitHub.' },
        { term: 'Branch', definition: 'A separate line of work used to build or test changes without disturbing the main line.' },
      ];
    }
    if (m.includes('ui') || m.includes('ux') || m.includes('layout') || m.includes('accessibility')) {
      return [
        { term: 'Hierarchy', definition: 'The order that tells users what to notice first, second, and third.' },
        { term: 'Feedback', definition: 'A visual or text response that confirms what happened after a user action.' },
        { term: 'Accessibility', definition: 'Designing so more people can understand and use the interface.' },
      ];
    }
    if (m.includes('sql') || m.includes('database')) {
      return [
        { term: 'Record', definition: 'One row of related data in a table.' },
        { term: 'Column', definition: 'A named field that stores one kind of value for each record.' },
        { term: 'Constraint', definition: 'A rule that protects table data, such as requiring a unique key.' },
      ];
    }
    return [
      { term: 'Input', definition: 'The value, file, command, user action, or condition the lesson starts with.' },
      { term: 'Operation', definition: 'The step that changes, checks, stores, displays, or sends the input.' },
      { term: 'Verification', definition: 'The evidence you use to confirm the code, command, design, or setup behaved correctly.' },
    ];
  }

  function learningAngles(moduleTitle, chapterTitle, topic) {
    const m = moduleTitle.toLowerCase();
    if (m.includes('cyber') || m.includes('password') || m.includes('phishing') || m.includes('owasp') || m.includes('secure')) {
      return {
        labels: ['Risk being reduced', 'Defense habit', 'Evidence to check'],
        summary: `${topic} teaches a practical security habit inside ${moduleTitle}. It focuses on what can go wrong, what safeguard reduces the risk, and what evidence proves the safeguard is working.`,
        overview: `${topic} matters because most security problems start from ordinary actions: a link is clicked, a password is reused, input is trusted, or permission is skipped. For students, the goal is not fear; the goal is learning how to slow down and check the path before data or accounts are exposed. Think of it like locking a classroom cabinet: the lock does not make theft impossible, but it lowers the chance and shows who should have access.`,
        details: [
          `${topic} should be studied by tracing a realistic scenario from start to finish. Identify the asset first, then name the threat, then decide which control reduces the risk without making the system painful to use.`,
          `In ${chapterTitle}, a good answer explains both the human side and the technical side. For example, training helps users notice fake messages, while validation and permission checks help the app reject unsafe actions.`,
          `The strongest practice is to verify the defense. Look for signs such as a blocked request, a stronger password rule, fewer exposed details, a safer error message, or logs that show suspicious activity was handled.`,
        ],
      };
    }
    if (m.includes('network') || m.includes('internet') || m.includes('dns') || m.includes('router') || m.includes('client')) {
      return {
        labels: ['Connection role', 'Data path', 'Troubleshooting signal'],
        summary: `${topic} explains how information moves between devices and services. The lesson connects the network part, the path data follows, and the clue you can use when something fails.`,
        overview: `${topic} is easier to understand when you imagine sending a package across a campus. The sender needs an address, the package may pass through several places, and the receiver must be ready to accept it. Networks work in a similar way, except the package is split into data and the addresses are digital.`,
        details: [
          `Start by asking which device or service is speaking. A browser, phone, router, DNS server, API server, and database can all be part of the same request, but each has a different job.`,
          `Next, follow the path. A useful network explanation names the source, destination, lookup step, transport step, and the response that comes back.`,
          `When troubleshooting, avoid guessing. Check one layer at a time: device connection, address, DNS name, port, protocol, server response, and finally the app logic.`,
        ],
      };
    }
    if (m.includes('cloud') || m.includes('hosting') || m.includes('storage') || m.includes('render') || m.includes('firebase') || m.includes('supabase')) {
      return {
        labels: ['Service responsibility', 'Deployment decision', 'Reliability check'],
        summary: `${topic} shows how cloud services help apps run outside a student laptop. The focus is what the provider handles, what the developer still controls, and how to confirm the service is healthy.`,
        overview: `${topic} is like borrowing a prepared computer lab instead of building every computer yourself. The provider gives the room, power, network, and tools, but you still decide what project to upload, what settings to use, and how to monitor it. This makes cloud work powerful, but it also means settings matter.`,
        details: [
          `A cloud lesson should separate provider responsibility from developer responsibility. Providers run the infrastructure; developers still manage code, configuration, permissions, data, and release habits.`,
          `The deployment decision depends on the app shape. A static site, Node server, database-backed app, file storage feature, and background worker may need different services.`,
          `A healthy setup is proven with logs, uptime checks, version labels, environment variables, and a repeatable deploy process.`,
        ],
      };
    }
    if (m.includes('ui') || m.includes('ux') || m.includes('layout') || m.includes('accessibility')) {
      return {
        labels: ['User need', 'Interface choice', 'Usability check'],
        summary: `${topic} teaches a design decision that affects how people read, tap, understand, or trust an interface. The focus is the user problem, the design choice, and the test that shows whether it helps.`,
        overview: `${topic} matters because an interface is a conversation with the user. If labels are unclear, spacing is cramped, or feedback is missing, users feel lost even when the code works. A good UI decision is like a clear sign in a hallway: it reduces hesitation and helps people move confidently.`,
        details: [
          `Start with the user task. A button, card, form, color, or layout should exist because it helps someone do something specific.`,
          `Then choose the interface treatment. Size, spacing, contrast, wording, grouping, and feedback all shape whether the screen feels understandable.`,
          `Finally, check the experience. A good design can be explained in terms of readability, tap accuracy, visual order, accessibility, and fewer mistakes.`,
        ],
      };
    }
    if (m.includes('sql') || m.includes('database')) {
      return {
        labels: ['Data question', 'Table operation', 'Record check'],
        summary: `${topic} teaches how stored data is organized, read, changed, or protected. The lesson connects the question being asked to the table operation and the records you should inspect after it runs.`,
        overview: `${topic} is like working with a class record book. Each student row has fields, and every change should be deliberate because other parts of the app may rely on that information. Databases reward careful questions: what data do I need, where is it stored, and how do I know I changed only the correct rows?`,
        details: [
          `Begin with the data question. Are you reading a list, finding one record, adding new information, correcting existing data, or protecting relationships between tables?`,
          `Then match the SQL or database operation to that question. A SELECT, INSERT, UPDATE, DELETE, JOIN, key, or constraint each solves a different kind of problem.`,
          `Always verify the affected records. Beginner mistakes often happen when a filter is missing, a relationship is misunderstood, or a query returns more rows than expected.`,
        ],
      };
    }
    if (m.includes('git') || m.includes('github') || m.includes('branch') || m.includes('merge')) {
      return {
        labels: ['Project state', 'Team action', 'History check'],
        summary: `${topic} explains how developers save work, share changes, and avoid losing progress. The lesson connects the current project state to the command or workflow that changes history safely.`,
        overview: `${topic} is like keeping checkpoints while building a school project. Instead of saving one final file and hoping nothing breaks, Git lets you save meaningful steps, compare changes, and return to known points. This is especially useful when several people work on the same app.`,
        details: [
          `First read the project state. Before using a command, check what changed, what branch you are on, and whether the remote copy is ahead or behind.`,
          `Next choose the team action. Adding, committing, pulling, pushing, branching, and merging each has a different effect on the project timeline.`,
          `Finally, check the history. A clean Git habit leaves understandable commits, fewer conflicts, and a clear path for teammates to review.`,
        ],
      };
    }
    return {
      labels: ['When to use it', 'How it works', 'How to verify it'],
      summary: `${topic} teaches a practical part of ${moduleTitle}. The lesson focuses on when the idea is useful, how the step works, and how a beginner can confirm it behaved correctly.`,
      overview: `${topic} appears in real student projects because software is built from many small decisions. Each decision should answer a clear need instead of being copied blindly. A simple analogy is following a lab procedure: the instruction matters, but the observation after the step matters just as much.`,
      details: [
        `Start by naming the situation where ${topic} is useful. This keeps the lesson connected to real work instead of becoming a list of terms.`,
        `Then study the operation itself. Look at the important words, symbols, settings, files, or interface choices that make the step work.`,
        `Finally, verify the outcome. Depending on the topic, that may be a console line, a table row, a visible page change, a successful request, or a safer workflow.`,
      ],
    };
  }

  function previewDoc(body) {
    return `<!doctype html><html><head><meta charset="utf-8"><style>
      body{margin:0;font-family:Inter,Arial,sans-serif;background:#f8fafc;color:#0f172a;padding:14px}
      *{box-sizing:border-box}.console{white-space:pre-wrap;background:#0f172a;color:#bbf7d0;border-radius:12px;padding:12px;margin:10px 0 0}
      .demo-nav,.demo-form,.demo-alert,.demo-card,.demo-gallery,.demo-table-wrap,.demo-hero,.demo-profile,.demo-menu,.demo-dashboard,.demo-banner,.demo-product,.demo-article{border:2px solid #38bdf8;border-radius:16px;background:#fff;padding:14px;box-shadow:0 10px 24px rgba(15,23,42,.08)}
      .demo-nav{display:flex;gap:10px;align-items:center}.demo-nav a{padding:8px 10px;border-radius:999px;background:#e0f2fe;color:#075985;font-weight:800}
      .demo-form{display:grid;gap:10px;max-width:320px}.demo-form input{padding:9px;border:1px solid #94a3b8;border-radius:10px}.demo-form button,.demo-button-group button,.demo-hero button{padding:9px 12px;border:0;border-radius:10px;background:#0ea5e9;color:white;font-weight:800}
      .demo-alert{border-color:#f97316;background:#fff7ed}.demo-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.demo-gallery figure{margin:0;min-height:64px;border-radius:12px;background:#dff6ff;display:grid;place-items:center;font-weight:800}
      .demo-table{width:100%;border-collapse:collapse}.demo-table th,.demo-table td{border:1px solid #38bdf8;padding:8px;text-align:left}
      .demo-hero{background:linear-gradient(135deg,#e0f2fe,#fff);min-height:130px}.demo-profile .avatar{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:#bae6fd;font-weight:900}
      .demo-menu{display:grid;gap:8px;max-width:220px}.demo-menu button{padding:9px;border:1px solid #38bdf8;border-radius:10px;background:#f0f9ff;text-align:left;font-weight:800}
      .demo-dashboard{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.demo-dashboard div{padding:12px;border-radius:12px;background:#ecfeff;text-align:center;font-weight:800}
      .demo-banner{background:#eef2ff;border-color:#818cf8}.demo-product{max-width:280px}.demo-product .price{font-size:1.4rem;font-weight:900;color:#0f766e}
      .demo-article h2{margin-top:0}.demo-highlight{outline:3px solid #22c55e;outline-offset:3px}
    </style></head><body>${body}</body></html>`;
  }

  const demoModels = [
    {
      name: 'navbar',
      title: 'navigation bar',
      target: '.demo-nav',
      child: '.demo-nav a:nth-child(2)',
      markup: '<nav class="demo-nav"><a>Home</a><a>Lessons</a><a>Profile</a></nav>',
      baseCss: '.demo-nav{display:flex;gap:10px;align-items:center}.demo-nav a{padding:8px 10px;border-radius:999px;background:#e0f2fe;color:#075985;font-weight:800}',
    },
    {
      name: 'form',
      title: 'student form',
      target: '.demo-form',
      child: '.demo-form button',
      markup: '<form class="demo-form"><label>Student name <input value="Mika"></label><label>Section <input value="BSIT 1A"></label><button type="button">Save</button></form>',
      baseCss: '.demo-form{display:grid;gap:10px;max-width:320px}.demo-form input{padding:9px;border:1px solid #94a3b8;border-radius:10px}.demo-form button{padding:9px 12px;border:0;border-radius:10px;background:#0ea5e9;color:white;font-weight:800}',
    },
    {
      name: 'alert',
      title: 'alert message',
      target: '.demo-alert',
      child: '.demo-alert strong',
      markup: '<div class="demo-alert"><strong>Warning</strong><p>Review your requirement before submitting.</p></div>',
      baseCss: '.demo-alert{border:2px solid #f97316;border-radius:16px;background:#fff7ed;padding:14px}.demo-alert p{margin:.35rem 0 0}',
    },
    {
      name: 'card',
      title: 'course card',
      target: '.demo-card',
      child: '.demo-card button',
      markup: '<article class="demo-card"><h3>Web Development</h3><p>Build a small responsive page.</p><button>Open lesson</button></article>',
      baseCss: '.demo-card{border:2px solid #38bdf8;border-radius:16px;background:#fff;padding:14px;max-width:300px}.demo-card button{padding:8px 10px;border:0;border-radius:10px;background:#0ea5e9;color:white;font-weight:800}',
    },
    {
      name: 'gallery',
      title: 'image gallery',
      target: '.demo-gallery',
      child: '.demo-gallery figure:nth-child(2)',
      markup: '<section class="demo-gallery"><figure>Photo A</figure><figure>Photo B</figure><figure>Photo C</figure></section>',
      baseCss: '.demo-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.demo-gallery figure{margin:0;min-height:64px;border-radius:12px;background:#dff6ff;display:grid;place-items:center;font-weight:800}',
    },
    {
      name: 'table',
      title: 'grade table',
      target: '.demo-table-wrap',
      child: '.demo-table td:nth-child(2)',
      markup: '<div class="demo-table-wrap"><table class="demo-table"><tr><th>Name</th><th>Score</th></tr><tr><td>Ana</td><td>95</td></tr><tr><td>Leo</td><td>88</td></tr></table></div>',
      baseCss: '.demo-table{width:100%;border-collapse:collapse}.demo-table th,.demo-table td{border:1px solid #38bdf8;padding:8px;text-align:left}.demo-table-wrap{border:2px solid #38bdf8;border-radius:16px;background:#fff;padding:12px}',
    },
    {
      name: 'hero',
      title: 'hero section',
      target: '.demo-hero',
      child: '.demo-hero button',
      markup: '<section class="demo-hero"><h2>Start Coding Today</h2><p>Practice a small skill and check the preview.</p><button>Begin</button></section>',
      baseCss: '.demo-hero{border:2px solid #38bdf8;border-radius:16px;background:linear-gradient(135deg,#e0f2fe,#fff);padding:18px;min-height:130px}.demo-hero button{padding:9px 12px;border:0;border-radius:10px;background:#0ea5e9;color:white;font-weight:800}',
    },
    {
      name: 'profile',
      title: 'profile card',
      target: '.demo-profile',
      child: '.demo-profile .avatar',
      markup: '<article class="demo-profile"><div class="avatar">A</div><h3>Ana Cruz</h3><p>Frontend student</p></article>',
      baseCss: '.demo-profile{border:2px solid #38bdf8;border-radius:16px;background:#fff;padding:14px;max-width:260px}.demo-profile .avatar{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:#bae6fd;font-weight:900}',
    },
    {
      name: 'menu',
      title: 'side menu',
      target: '.demo-menu',
      child: '.demo-menu button:first-child',
      markup: '<aside class="demo-menu"><button>Dashboard</button><button>Files</button><button>Settings</button></aside>',
      baseCss: '.demo-menu{display:grid;gap:8px;max-width:220px;border:2px solid #38bdf8;border-radius:16px;background:#fff;padding:12px}.demo-menu button{padding:9px;border:1px solid #38bdf8;border-radius:10px;background:#f0f9ff;text-align:left;font-weight:800}',
    },
    {
      name: 'dashboard',
      title: 'mini dashboard',
      target: '.demo-dashboard',
      child: '.demo-dashboard div:nth-child(3)',
      markup: '<section class="demo-dashboard"><div>Tasks<br><b>12</b></div><div>Done<br><b>8</b></div><div>Score<br><b>92</b></div></section>',
      baseCss: '.demo-dashboard{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.demo-dashboard div{padding:12px;border-radius:12px;background:#ecfeff;text-align:center;font-weight:800;border:1px solid #67e8f9}',
    },
    {
      name: 'banner',
      title: 'announcement banner',
      target: '.demo-banner',
      child: '.demo-banner strong',
      markup: '<section class="demo-banner"><strong>Reminder:</strong> Submit the lab activity this week.</section>',
      baseCss: '.demo-banner{border:2px solid #818cf8;border-radius:16px;background:#eef2ff;padding:14px;font-weight:700}',
    },
    {
      name: 'product',
      title: 'product card',
      target: '.demo-product',
      child: '.demo-product .price',
      markup: '<article class="demo-product"><h3>Starter Kit</h3><p>Notebook, pen, and USB drive.</p><div class="price">P199</div><button>Add</button></article>',
      baseCss: '.demo-product{border:2px solid #38bdf8;border-radius:16px;background:#fff;padding:14px;max-width:280px}.demo-product .price{font-size:1.4rem;font-weight:900;color:#0f766e}.demo-product button{padding:8px 10px;border:0;border-radius:10px;background:#0ea5e9;color:white;font-weight:800}',
    },
    {
      name: 'article',
      title: 'article preview',
      target: '.demo-article',
      child: '.demo-article h2',
      markup: '<article class="demo-article"><h2>Study Notes</h2><p>Readable text helps learners understand the topic faster.</p><p class="meta">5 min read</p></article>',
      baseCss: '.demo-article{border:2px solid #38bdf8;border-radius:16px;background:#fff;padding:14px;max-width:360px}.demo-article h2{margin-top:0}.demo-article .meta{color:#64748b;font-weight:800}',
    },
  ];

  function hashText(value) {
    return String(value || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  }

  function modelsFor(moduleTitle, chapterTitle, topic, lessonIndex) {
    const chapterSeed = hashText(`${moduleTitle}-${chapterTitle}`);
    const topicSeed = hashText(topic);
    const start = (chapterSeed * 7 + topicSeed * 5 + (lessonIndex || 0) * 4) % demoModels.length;
    return [0, 1, 2].map((offset) => demoModels[(start + offset * 3) % demoModels.length]);
  }

  function htmlExample(topic, model, variant) {
    if (model.name === 'navbar') return `<nav class="demo-nav" aria-label="${topic} navigation"><a href="#home">Home</a><a href="#${slug(topic)}">${topic}</a><a href="#help">Help</a></nav>`;
    if (model.name === 'form') return `<form class="demo-form"><label>${topic} input <input placeholder="Type a value"></label><button type="button">Submit</button></form>`;
    if (model.name === 'gallery') return `<section class="demo-gallery"><figure>${topic} 1</figure><figure>${topic} 2</figure><figure>${topic} 3</figure></section>`;
    if (model.name === 'table') return `<div class="demo-table-wrap"><table class="demo-table"><tr><th>Topic</th><th>Status</th></tr><tr><td>${topic}</td><td>Learning</td></tr></table></div>`;
    if (model.name === 'hero') return `<section class="demo-hero"><h2>${topic}</h2><p>This hero section introduces the lesson clearly.</p><button>Start</button></section>`;
    if (model.name === 'alert') return `<div class="demo-alert"><strong>${topic}</strong><p>This alert gives a short classroom reminder.</p></div>`;
    if (model.name === 'profile') return `<article class="demo-profile"><div class="avatar">${topic.charAt(0)}</div><h3>${topic}</h3><p>Practice profile layout.</p></article>`;
    if (model.name === 'menu') return `<aside class="demo-menu"><button>${topic}</button><button>Practice</button><button>Review</button></aside>`;
    if (model.name === 'dashboard') return `<section class="demo-dashboard"><div>${topic}<br><b>3</b></div><div>Done<br><b>2</b></div><div>Score<br><b>95</b></div></section>`;
    if (model.name === 'banner') return `<section class="demo-banner"><strong>${topic}:</strong> This banner highlights a short message.</section>`;
    if (model.name === 'product') return `<article class="demo-product"><h3>${topic} Kit</h3><p>Starter resources for this lesson.</p><div class="price">P199</div><button>Add</button></article>`;
    if (model.name === 'article') return `<article class="demo-article"><h2>${topic}</h2><p>This article preview shows readable lesson content.</p><p class="meta">5 min read</p></article>`;
    return `<article class="demo-card"><h3>${topic}</h3><p>A focused lesson card with readable content.</p><button>Open</button></article>`;
  }

  function cssDemo(topic, model, variant) {
    const rule = cssValue(topic).replace(/\n/g, ' ');
    if (variant === 1) return `${model.target} {\n  ${rule}\n}`;
    if (variant === 2) return `${model.child || model.target} {\n  ${rule}\n}\n${model.target} {\n  outline: 2px dashed #22c55e;\n}`;
    return `${model.target}:hover {\n  ${rule}\n  transition: all .2s ease;\n}\n${model.child || model.target} {\n  transform: scale(1.02);\n}`;
  }

  function jsDemo(topic, model, variant) {
    const safeTopic = String(topic).replace(/'/g, "\\'");
    if (variant === 1) return `const target = document.querySelector('${model.target}');\ntarget.classList.add('demo-highlight');\nconsole.log('Highlighted ${safeTopic} in the ${model.title}.');`;
    if (variant === 2) return `const target = document.querySelector('${model.child || model.target}');\ntarget.textContent = '${safeTopic} updated';\nconsole.log('Changed one part of the ${model.title}.');`;
    return `const note = document.createElement('p');\nnote.textContent = 'New ${safeTopic} note added by JavaScript.';\ndocument.querySelector('${model.target}').appendChild(note);\nconsole.log('Added a new note to the ${model.title}.');`;
  }

  function beforeAfterFor(moduleTitle, topic, code, kind, model) {
    if (kind !== 'css') return {};
    return {
      before: previewDoc(`<style>${model.baseCss}</style>${model.markup}`),
      after: previewFor(moduleTitle, topic, code, kind, model),
    };
  }

  function previewFor(moduleTitle, topic, code, kind, model) {
    if (kind === 'html') return previewDoc(code);
    if (kind === 'css') return previewDoc(`<style>${model.baseCss}\n${code}</style>${model.markup}`);
    if (kind === 'javascript') return previewDoc(`<style>${model.baseCss}</style>${model.markup}<script>const logs=[];const original=console.log;console.log=(...args)=>{logs.push(args.join(' '));original(...args)};try{${code}}catch(error){logs.push('Error: '+error.message)}document.body.insertAdjacentHTML('beforeend','<pre class="console">'+logs.join('\\n')+'</pre>');<\/script>`);
    return previewDoc(`<pre class="console">${resultFor(moduleTitle, topic)}</pre>`);
  }

  function outputForModel(topic, model, variant) {
    if (variant === 1) return `The preview applies ${topic} to the full ${model.title}, so the visible result is tied to the selector or markup in the code.`;
    if (variant === 2) return `Only the targeted part of the ${model.title} changes, such as one link, button, cell, label, or highlighted section.`;
    return `The ${model.title} shows a project-style result for ${topic}, such as added content, hover styling, layout spacing, or a highlighted area created by the current code.`;
  }

  function explanationForModel(topic, model, variant) {
    if (variant === 1) return `This example applies ${topic} to a ${model.title}. The preview changes the main element, so students can connect the code to a real interface instead of a generic sample.`;
    if (variant === 2) return `This example targets a smaller part of the ${model.title}. That matters in real projects because developers often style or update one button, label, table cell, or card section without changing the whole page.`;
    return `This example turns ${topic} into a mini interface behavior. It shows how the same concept can appear in a project screen, such as a dashboard, menu, banner, product card, or profile area.`;
  }

  function consoleExampleSet(moduleTitle, chapterTitle, topic, lessonIndex = 0) {
    const safe = topic.replace(/["`]/g, '').replace(/\s+/g, ' ').trim();
    const m = moduleTitle.toLowerCase();
    const seed = (hashText(`${moduleTitle}-${chapterTitle}-${topic}`) + lessonIndex) % 6;
    if (m.includes('java') && !m.includes('javascript')) {
      const javaTemplates = [
        {
          title: `${topic}: Java console output`,
          code: `public class Main {\n  public static void main(String[] args) {\n    String topic = "${safe}";\n    int score = ${88 + seed};\n    System.out.println(topic);\n    System.out.println("Score: " + score);\n  }\n}`,
          outputMode: 'console',
          output: `${safe}\nScore: ${88 + seed}`,
          explanation: `This Java example prints real console lines. If you change the text or the number, the console output changes to match the current code.`,
        },
        {
          title: `${topic}: Java variable check`,
          code: `public class Main {\n  public static void main(String[] args) {\n    String topic = "${safe}";\n    double grade = 94.5;\n    System.out.println(topic + " grade: " + grade);\n  }\n}`,
          outputMode: 'console',
          output: `${safe} grade: 94.5`,
          explanation: `This uses variables and string joining, the same style beginners use when checking stored values in Java.`,
        },
        {
          title: `${topic}: Java calculation result`,
          code: `public class Main {\n  public static void main(String[] args) {\n    int activities = ${2 + (seed % 3)};\n    int pointsEach = ${5 + seed};\n    System.out.println(activities * pointsEach);\n  }\n}`,
          outputMode: 'console',
          output: String((2 + (seed % 3)) * (5 + seed)),
          explanation: `This turns the lesson into a small arithmetic check. The console shows the calculated total, not a decorative preview.`,
        },
        {
          title: `${topic}: Java loop result`,
          code: `public class Main {\n  public static void main(String[] args) {\n    for (int count = 1; count <= 3; count++) {\n      System.out.println("${safe} " + count);\n    }\n  }\n}`,
          outputMode: 'console',
          output: `${safe} 1\n${safe} 2\n${safe} 3`,
          explanation: `This loop prints three console lines. It is intentionally console-based because Java fundamentals normally produce terminal output, not webpage previews.`,
        },
        {
          title: `${topic}: Java boolean check`,
          code: `public class Main {\n  public static void main(String[] args) {\n    boolean ready = ${seed % 2 === 0 ? 'true' : 'false'};\n    System.out.println("Ready for ${safe}: " + ready);\n  }\n}`,
          outputMode: 'console',
          output: `Ready for ${safe}: ${seed % 2 === 0 ? 'true' : 'false'}`,
          explanation: `This example uses a boolean so students can see a true/false result in a real console-style output.`,
        },
        {
          title: `${topic}: Java text label`,
          code: `public class Main {\n  public static void main(String[] args) {\n    char section = '${String.fromCharCode(65 + (seed % 4))}';\n    System.out.println("${safe} section " + section);\n  }\n}`,
          outputMode: 'console',
          output: `${safe} section ${String.fromCharCode(65 + (seed % 4))}`,
          explanation: `This uses a char value with text joining, which keeps the example close to beginner classroom programs.`,
        },
      ];
      return [0, 1, 2].map((offset) => javaTemplates[(seed + offset * 2) % javaTemplates.length]);
    }
    if (m.includes('python')) {
      const pythonTemplates = [
        {
          title: `${topic}: Python print output`,
          code: `topic = "${safe}"\nscore = ${90 + seed}\nprint(topic)\nprint(score)`,
          outputMode: 'console',
          output: `${safe}\n${90 + seed}`,
          explanation: `This Python example prints the current variable values. Editing the string or number changes the console output.`,
        },
        {
          title: `${topic}: Python f-string`,
          code: `topic = "${safe}"\ngrade = 94.5\nprint(f"{topic} grade: {grade}")`,
          outputMode: 'console',
          output: `${safe} grade: 94.5`,
          explanation: `This shows a beginner f-string pattern. The output is text in a console, which matches Python syntax lessons.`,
        },
        {
          title: `${topic}: Python calculation`,
          code: `activities = ${2 + (seed % 4)}\npoints_each = ${4 + seed}\nprint(activities * points_each)`,
          outputMode: 'console',
          output: String((2 + (seed % 4)) * (4 + seed)),
          explanation: `This example checks a simple calculation so the output is connected to the current numbers in the code.`,
        },
        {
          title: `${topic}: Python loop result`,
          code: `topic = "${safe}"\nfor count in range(1, 4):\n    print(topic + " " + str(count))`,
          outputMode: 'console',
          output: `${safe} 1\n${safe} 2\n${safe} 3`,
          explanation: `This loop example shows repeated console output instead of a webpage preview.`,
        },
        {
          title: `${topic}: Python boolean label`,
          code: `ready = ${seed % 2 === 0 ? 'True' : 'False'}\nprint("Ready for ${safe}: " + str(ready))`,
          outputMode: 'console',
          output: `Ready for ${safe}: ${seed % 2 === 0 ? 'true' : 'false'}`,
          explanation: `This keeps true/false practice in a console panel, where Python fundamentals belong.`,
        },
        {
          title: `${topic}: Python list count`,
          code: `subjects = ["HTML", "CSS", "${safe}"]\nprint(len(subjects))`,
          outputMode: 'console',
          output: '3',
          explanation: `This introduces list-style thinking without switching to a visual preview.`,
        },
      ];
      return [0, 1, 2].map((offset) => pythonTemplates[(seed + offset * 2) % pythonTemplates.length]);
    }
    if (m.includes('sql') || m.includes('database')) {
      const sqlTemplates = [
        {
          title: `${topic}: SQL SELECT rows`,
          code: `SELECT id, name, score\nFROM students;`,
          outputMode: 'table',
          output: 'A result table with student rows.',
          explanation: `This query returns rows from a mock students table, so the output is shown as a table instead of a console or webpage card.`,
        },
        {
          title: `${topic}: SQL filtered rows`,
          code: `SELECT name, score\nFROM students\nWHERE score >= 90;`,
          outputMode: 'table',
          output: 'Only rows with score 90 or higher.',
          explanation: `This query filters the mock dataset. Changing the WHERE value changes which table rows appear in supported beginner cases.`,
        },
        {
          title: `${topic}: SQL count result`,
          code: `SELECT COUNT(*) AS count\nFROM students;`,
          outputMode: 'table',
          output: 'A one-row table showing the number of mock students.',
          explanation: `This example returns a summary table instead of every row, which is common in database reporting.`,
        },
        {
          title: `${topic}: SQL alias result`,
          code: `SELECT '${safe}' AS topic;`,
          outputMode: 'table',
          output: 'A one-row table with an alias column.',
          explanation: `This shows how SQL can return a labeled value. The output is a table because SQL results are normally rows and columns.`,
        },
        {
          title: `${topic}: SQL ordered rows`,
          code: `SELECT name, score\nFROM students\nORDER BY score DESC;`,
          outputMode: 'table',
          output: 'Rows are shown as a sorted result table.',
          explanation: `This example emphasizes that SQL output is a table whose order can be controlled by the query.`,
        },
      ];
      return [0, 1, 2].map((offset) => sqlTemplates[(seed + offset) % sqlTemplates.length]);
    }
    const terminalTemplates = [
      {
        title: `${topic}: terminal practice`,
        code: m.includes('git') ? 'git status' : m.includes('linux') ? 'pwd' : `echo "Start ${safe}"`,
        outputMode: 'console',
        output: m.includes('git') ? 'On branch main\nnothing to commit, working tree clean' : m.includes('linux') ? '/class-app/practice' : `Start ${safe}`,
        explanation: `This command-style example belongs in a console output panel because it represents a first check for the lesson topic.`,
      },
      {
        title: `${topic}: second command`,
        code: m.includes('git') ? 'git add .' : m.includes('linux') ? 'ls' : `echo "Review ${safe}"`,
        outputMode: 'console',
        output: m.includes('git') ? '[No output]' : m.includes('linux') ? 'index.html\nscript.js\ncoding-educational/' : `Review ${safe}`,
        explanation: `This variation changes the command target so the simulated response is different from the first example.`,
      },
      {
        title: `${topic}: classroom check`,
        code: m.includes('git') ? `git commit -m "practice ${safe}"` : m.includes('linux') ? `mkdir ${slug(safe)}` : `echo "Apply ${safe}"`,
        outputMode: 'console',
        output: m.includes('git') ? '[main abc123] practice commit' : m.includes('linux') ? '[No output]' : `Apply ${safe}`,
        explanation: `This keeps non-visual lessons in a console-style workspace while showing a third distinct result.`,
      },
      {
        title: `${topic}: inspect files`,
        code: m.includes('git') ? 'git push origin main' : m.includes('linux') ? 'chmod 755 practice-folder' : `echo "${safe}"`,
        outputMode: 'console',
        output: m.includes('git') ? 'Everything up-to-date' : m.includes('linux') ? 'permissions updated for practice-folder' : safe,
        explanation: `This uses a short command so the result is readable and directly connected to the current lesson.`,
      },
      {
        title: `${topic}: folder check`,
        code: m.includes('linux') ? 'cd practice-folder\npwd' : m.includes('git') ? 'git pull origin main' : `echo "Practice ${safe}"`,
        outputMode: 'console',
        output: m.includes('linux') ? '/class-app/practice/practice-folder' : m.includes('git') ? 'Already up to date.' : `Practice ${safe}`,
        explanation: `This variation shows a different terminal task so nearby lessons do not all feel like the same command.`,
      },
    ];
    return [0, 1, 2].map((offset) => terminalTemplates[(seed + offset) % terminalTemplates.length]);
  }

  function examples(moduleTitle, chapterTitle, topic, lessonIndex = 0) {
    const kind = kindFor(moduleTitle);
    if (!['html', 'css', 'javascript'].includes(kind)) {
      return consoleExampleSet(moduleTitle, chapterTitle, topic, lessonIndex).map((example) => ({
        ...example,
        kind,
        editable: true,
        instructions: kind === 'sql'
          ? 'Edit the SQL query and run it to update the mock result table.'
          : 'Edit the program and run it to update the console output.',
      }));
    }
    const chosenModels = modelsFor(moduleTitle, chapterTitle, topic, lessonIndex);
    const codes = chosenModels.map((model, index) => {
      const variant = index + 1;
      if (kind === 'html') return htmlExample(topic, model, variant);
      if (kind === 'css') return cssDemo(topic, model, variant);
      if (kind === 'javascript') return jsDemo(topic, model, variant);
      return codeFor(moduleTitle, index === 0 ? topic : index === 1 ? `${topic} with a second value` : `${topic} classroom check`);
    });
    return chosenModels.map((model, index) => {
      const variant = index + 1;
      const code = codes[index];
      return {
        title: `${topic}: ${model.title} demo`,
        code,
        kind,
        editable: true,
        demoModel: model.name,
        outputMode: 'visual',
        markup: model.markup,
        baseCss: model.baseCss,
        instructions: kind === 'javascript'
          ? 'Edit the JavaScript and run it to update the DOM preview and console log.'
          : 'Edit the code and run it to update the browser-style preview.',
        preview: previewFor(moduleTitle, topic, code, kind, model),
        output: outputForModel(topic, model, variant),
        explanation: explanationForModel(topic, model, variant),
        ...beforeAfterFor(moduleTitle, topic, code, kind, model),
      };
    });
  }

  function richLesson(moduleTitle, chapterTitle, topicSpec, lessonIndex = 0) {
    const topic = typeof topicSpec === 'string' ? topicSpec : topicSpec.title;
    const customItems = typeof topicSpec === 'string' ? null : topicSpec.items;
    const customKeywords = typeof topicSpec === 'string' ? [] : (topicSpec.keywords || []);
    const sourceList = sourceFor(moduleTitle);
    const lessonExamples = (typeof topicSpec === 'string' ? null : topicSpec.examples) || examples(moduleTitle, chapterTitle, topic, lessonIndex);
    const angles = learningAngles(moduleTitle, chapterTitle, topic);
    const breakdown = (customItems && customItems.length ? customItems : [
      item(angles.labels[0], `${topic} belongs here because ${chapterTitle} needs this skill in a real beginner project. This part explains the situation where the idea is useful before any code or command is copied.`, syntaxFor(moduleTitle, topic), resultFor(moduleTitle, topic)),
      item(angles.labels[1], `This part shows the action behind ${topic}: what is selected, changed, requested, protected, arranged, or checked. It turns the topic into a step a student can actually perform.`, syntaxFor(moduleTitle, topic), resultFor(moduleTitle, topic)),
      item(angles.labels[2], `This part explains what evidence to look for after using ${topic}. The evidence might be a console message, table row, interface change, safer behavior, or cleaner workflow.`, codeFor(moduleTitle, topic), resultFor(moduleTitle, topic)),
    ]).map((part) => ({
      item: part.item,
      explanation: part.explanation,
      syntax: part.syntax || syntaxFor(moduleTitle, part.item),
      example: part.example || codeFor(moduleTitle, part.item),
      output: part.output || resultFor(moduleTitle, part.item),
    }));
    return {
      id: slug(`${moduleTitle}-${chapterTitle}-${topic}`),
      title: topic,
      readingTime: '8 min',
      tags: ['Beginner', moduleTitle, chapterTitle],
      keywords: [moduleTitle, chapterTitle, topic, ...customKeywords, ...breakdown.flatMap((part) => [part.item, part.syntax, part.example, part.output])].filter(Boolean),
      summary: angles.summary,
      overview: angles.overview,
      termsToKnow: lessonTerms(moduleTitle, chapterTitle, topic),
      detailedExplanation: angles.details,
      breakdown,
      syntax: syntaxFor(moduleTitle, topic),
      keyPoints: [
        `${topic} is tied to a specific task in ${moduleTitle}, not just a definition to memorize.`,
        `The ${chapterTitle} chapter shows where this skill fits beside nearby lessons.`,
        'Examples should be edited and checked so cause and effect become clear.',
        'A strong student answer explains the action taken and the evidence seen afterward.',
      ],
      example: { title: `${topic} Starter Code`, code: lessonExamples[0].code },
      examples: lessonExamples,
      outputExplanation: [
        `Use the preview, console, or table area as evidence. For ${topic}, the important question is: did the screen, data, command response, or workflow change in the way the lesson described?`,
        `If the check does not match, change one detail at a time. This keeps debugging calm and prevents a beginner from guessing through many edits at once.`,
      ],
      whyThisWorks: [
        `${topic} works because ${moduleTitle} follows a predictable contract: you provide an instruction, the tool applies that instruction to a target, and you inspect the evidence afterward.`,
        `The workspace helps because it makes the lesson testable. Students can edit the code, command, query, or demo and immediately compare their prediction with what happened.`,
      ],
      exercise: {
        prompt: `Mini lab: change one meaningful part of a ${topic} example, then write one sentence explaining what evidence proved your change worked.`,
        starter: `I changed ${topic} by `,
        expected: [topic.split(' ')[0].toLowerCase()],
      },
      commonMistakes: [
        `Copying ${topic} without knowing which target it affects.`,
        'Changing too many things at once, which makes the real cause harder to identify.',
      ],
      recap: `${topic} is part of the ${moduleTitle} foundation. Before continuing, make sure you can explain when to use it, what action it performs, and what evidence confirms it worked.`,
      sources: sourceList,
    };
  }

  function makeQuiz(chapterId, lessons) {
    return lessons.slice(0, 5).map((lesson, index) => ({
      id: `${chapterId}-q${index + 1}`,
      question: `Which statement best describes ${lesson.title}?`,
      choices: [lesson.recap, 'It should be memorized without running examples.', 'It is unrelated to beginner projects.', 'It only changes decoration and never affects results.'],
      answerIndex: 0,
    }));
  }

  function chapter(moduleTitle, spec) {
    const lessons = spec.topics.map((topic, index) => richLesson(moduleTitle, spec.title, topic, index));
    while (lessons.length < 5) lessons.push(richLesson(moduleTitle, spec.title, `${spec.title} Guided Task ${lessons.length + 1}`, lessons.length));
    const chapterId = slug(`${moduleTitle}-${spec.title}`);
    return { id: chapterId, title: spec.title, description: spec.description || `Study ${spec.title} in ${moduleTitle} with textbook-style lessons.`, level: 'Beginner', lessons, quiz: makeQuiz(chapterId, lessons) };
  }

  function op(parts) {
    return parts.map(([name, explanation, example, output]) => item(name, explanation, example, output));
  }

  const javaPlan = [
    ['Introduction', ['What Java Is','JVM and Portability','Compiling and Running','Java in School Projects','Reading Java Errors']],
    ['Setup', ['Installing a JDK','Using javac','Using java','Project Folders','Classpath Basics']],
    ['Program Structure', ['Class Declaration','Main Method','Statements','Comments','Package Basics']],
    ['Variables', ['Declaring Variables','Assigning Values','final Constants','Naming Rules','Variable Scope']],
    ['Data Types', ['int','double','char','boolean','String as Text']],
    ['Operators', [
      { title: 'Arithmetic Operators (+, -, *, /, %)', keywords: ['+', '-', '*', '/', '%', 'modulo'], items: op([['+', 'Adds numbers or joins text.', 'System.out.println(5 + 3);', '8'], ['-', 'Subtracts the right value from the left value.', 'System.out.println(9 - 4);', '5'], ['*', 'Multiplies values.', 'System.out.println(6 * 7);', '42'], ['/', 'Divides values. Integer division removes decimals.', 'System.out.println(10 / 3);', '3'], ['%', 'Returns the remainder after division.', 'System.out.println(10 % 3);', '1']]) },
      { title: 'Relational Operators (==, !=, >, <, >=, <=)', keywords: ['==','!=','>','<','>=','<='], items: op([['==', 'Checks equality.', 'System.out.println(5 == 5);', 'true'], ['!=', 'Checks not equal.', 'System.out.println(5 != 3);', 'true'], ['>', 'Checks greater than.', 'System.out.println(7 > 4);', 'true'], ['<', 'Checks less than.', 'System.out.println(2 < 9);', 'true'], ['>=', 'Checks greater than or equal.', 'System.out.println(5 >= 5);', 'true'], ['<=', 'Checks less than or equal.', 'System.out.println(4 <= 6);', 'true']]) },
      { title: 'Logical Operators (&&, ||, !)', keywords: ['&&','||','!'], items: op([['&&', 'True only when both conditions are true.', 'System.out.println(90 >= 75 && true);', 'true'], ['||', 'True when at least one condition is true.', 'System.out.println(false || true);', 'true'], ['!', 'Reverses a boolean value.', 'System.out.println(!false);', 'true']]) },
      { title: 'Assignment Operators (=, +=, -=, *=, /=)', keywords: ['=','+=','-=','*=','/='], items: op([['=', 'Stores a value.', 'int score = 10;', 'score becomes 10'], ['+=', 'Adds and stores.', 'score += 5;', 'score becomes 15'], ['-=', 'Subtracts and stores.', 'score -= 2;', 'score becomes 8'], ['*=', 'Multiplies and stores.', 'score *= 3;', 'score becomes 30'], ['/=', 'Divides and stores.', 'score /= 2;', 'score becomes 5']]) },
      { title: 'Unary Operators (++, --)', keywords: ['++','--'], items: op([['++', 'Increases by one.', 'int x = 1; x++; System.out.println(x);', '2'], ['--', 'Decreases by one.', 'int x = 2; x--; System.out.println(x);', '1']]) },
      { title: 'Ternary Operator (?:)', keywords: ['?:','?',':'], items: op([['?:', 'Chooses one of two values based on a condition.', 'String result = grade >= 75 ? "Pass" : "Fail";', 'Pass if grade is at least 75']]) },
    ]],
    ['Input/Output', ['System.out.print','System.out.println','Scanner Input','Reading Numbers','Reading Strings']],
    ['Conditions', ['if Statement','else Statement','else if Ladder','Nested Conditions','switch Statement']],
    ['Loops', ['for Loop','while Loop','do while Loop','break and continue','Nested Loops']],
    ['Methods', ['Method Declaration','Parameters','Return Values','void Methods','Method Overloading']],
    ['Arrays', ['Creating Arrays','Array Indexes','Array Length','Looping Arrays','Two-Dimensional Arrays']],
    ['Strings', ['String Creation','length()','charAt()','equals()','substring()']],
    ['OOP', ['Classes and Objects','Fields','Constructors','Encapsulation','Inheritance']],
    ['Exceptions', ['try and catch','finally','throw','Checked Exceptions','Reading Stack Traces']],
    ['File Handling', ['Reading Files','Writing Files','Paths','Closing Resources','Handling File Errors']],
    ['Swing Basics', ['JFrame','JPanel','JButton','JLabel and JTextField','Event Listeners']],
  ];

  const htmlPlan = [
    ['Structure', ['DOCTYPE','html Element','head Element','body Element','Page Nesting']],
    ['Text Elements', ['Headings h1 to h6','Paragraphs','Strong and Emphasis','Line Breaks','Blockquote']],
    ['Links', ['Anchor Element','href Attribute','Relative Links','External Links','Email and Phone Links']],
    ['Images', ['img Element','src Attribute','alt Attribute','Image Size','Figure and Figcaption']],
    ['Lists', ['Unordered Lists','Ordered Lists','List Items','Nested Lists','Description Lists']],
    ['Tables', ['table Element','tr Rows','th Headers','td Cells','caption and scope']],
    ['Forms', ['form Element','label Element','input Types','textarea and select','button Element']],
    ['Semantic HTML', ['header','main','section','article','footer']],
    ['Media', ['audio Element','video Element','source Element','track Element','Media Fallback Text']],
    ['Attributes', ['id Attribute','class Attribute','href Attribute','src Attribute','alt Attribute','title Attribute','target Attribute','style Attribute']],
  ];

  const cssProps = ['color','background-color','background-image','width / height','margin','padding','border','border-radius','font-size','font-family','text-align','display','position','z-index','overflow','opacity','box-shadow','flex properties','grid properties'].map((name) => ({ title: name, keywords: [name], items: [item(name, `${name} controls a specific part of the rendered element, such as text color, spacing, size, shape, stacking, or layout behavior. The preview compares the plain version with the styled version so the difference is easy to see.`, `.box {\n  ${cssValue(name)}\n}`, `The preview shows exactly how ${name} changes the selected boxes or their container.`)] }));
  const cssPlan = [
    ['Selectors', ['Type Selectors','Class Selectors','ID Selectors','Attribute Selectors','Pseudo-class Selectors']],
    ['Box Model', ['Content Area','width / height','margin','padding','border']],
    ['Properties', cssProps],
    ['Flexbox', ['display flex','flex-direction','justify-content','align-items','gap']],
    ['Grid', ['display grid','grid-template-columns','grid-template-rows','grid-area','minmax()']],
    ['Responsive Design', ['Viewport','Media Queries','Fluid Widths','Responsive Images','Mobile First']],
    ['Transitions', ['transition-property','transition-duration','transition-timing-function','transition-delay','Hover Transitions']],
    ['Animations', ['@keyframes','animation-name','animation-duration','animation-iteration-count','Reduced Motion']],
    ['Typography', ['font-size','font-family','font-weight','line-height','letter-spacing']],
    ['Visual Effects', ['opacity','box-shadow','filter','backdrop-filter','transform']],
  ];

  const jsPlan = [
    ['Basics', ['What JavaScript Does','script Tags','Console Output','Statements','Comments']],
    ['Variables', ['let','const','var','Naming Variables','Scope Basics']],
    ['Data Types', ['String','Number','Boolean','null and undefined','typeof']],
    ['Operators', ['Arithmetic Operators','Comparison Operators','Logical Operators','Assignment Operators','Ternary Operator']],
    ['Conditions', ['if Statement','else Statement','else if','switch','Truthy and Falsy']],
    ['Loops', ['for Loop','while Loop','for...of','break','continue']],
    ['Functions', ['Function Declaration','Parameters','Return Values','Arrow Functions','Callback Basics']],
    ['Arrays', ['Creating Arrays','Indexes','push and pop','map','filter']],
    ['Objects', ['Object Literals','Properties','Methods','this Basics','Nested Objects']],
    ['DOM', ['querySelector','textContent','classList','createElement','appendChild']],
    ['Events', ['click Events','input Events','submit Events','event Object','preventDefault']],
  ];

  const pythonPlan = [
    ['Basics', ['What Python Is','Running Python','print()','Comments','Indentation']],
    ['Variables', ['Assigning Variables','Naming Rules','Reassignment','Constants by Convention','Scope Basics']],
    ['Data Types', ['int','float','str','bool','None']],
    ['Input/Output', ['input()','print Formatting','Converting Input','f-strings','Reading Simple Values']],
    ['Conditions', ['if','elif','else','Comparison Operators','Logical Operators']],
    ['Loops', ['for Loop','while Loop','range()','break','continue']],
    ['Functions', ['def','Parameters','Return Values','Default Values','Docstrings']],
    ['Lists', ['Creating Lists','Indexes','append()','remove()','Looping Lists']],
    ['Dictionaries', ['Key Value Pairs','Reading Values','Adding Values','Looping Dictionaries','get()']],
    ['OOP', ['Classes','Objects','__init__','Methods','Attributes']],
  ];

  function withFocus(focus, chapters) {
    return chapters.map(([chapterTitle, topics]) => [
      chapterTitle,
      topics.map((topic) => typeof topic === 'string' ? `${focus}: ${topic}` : topic),
    ]);
  }

  function languagePlan(title) {
    return withFocus(title, [
      ['Getting Started', ['where it is used', 'tooling overview', 'first file', 'running a small program', 'reading beginner errors']],
      ['Values and Names', ['variables', 'constants', 'text values', 'number values', 'boolean values']],
      ['Decisions', ['comparison checks', 'if paths', 'else paths', 'multiple choices', 'guard conditions']],
      ['Repetition', ['counted loops', 'condition loops', 'loop counters', 'stopping a loop', 'nested loops']],
      ['Reusable Blocks', ['functions or methods', 'parameters', 'return values', 'local scope', 'naming habits']],
      ['Collections', ['lists or arrays', 'indexes', 'adding items', 'reading many items', 'simple searches']],
      ['Program Structure', ['files and folders', 'comments', 'imports or libraries', 'entry point', 'small project layout']],
      ['Error Handling', ['syntax mistakes', 'runtime mistakes', 'debug print checks', 'safe input checks', 'reading error messages']],
      ['Mini Interfaces', ['simple input screen', 'menu flow', 'validation message', 'formatted output', 'user feedback']],
      ['Practice Projects', ['calculator task', 'grade checker', 'list tracker', 'quiz task', 'review checklist']],
    ]);
  }

  function frontendPlan(title) {
    return withFocus(title, [
      ['Browser Foundations', ['requesting a page', 'loading assets', 'document structure', 'developer tools', 'page refresh checks']],
      ['Page Layouts', ['header layout', 'content sections', 'card groups', 'footer placement', 'mobile stacking']],
      ['Visual Styling', ['color contrast', 'spacing scale', 'type hierarchy', 'rounded elements', 'hover feedback']],
      ['Responsive Screens', ['fluid width', 'breakpoints', 'touch spacing', 'image scaling', 'portrait testing']],
      ['DOM Interaction', ['selecting elements', 'changing text', 'toggling classes', 'adding elements', 'handling empty states']],
      ['Forms and Input', ['labels', 'required fields', 'validation messages', 'submit flow', 'success feedback']],
      ['Component Thinking', ['button component', 'card component', 'modal pattern', 'list item pattern', 'stateful component']],
      ['Accessibility', ['semantic labels', 'keyboard focus', 'alt text', 'contrast checks', 'clear wording']],
      ['Performance Habits', ['small images', 'deferred scripts', 'minimal reflow', 'cached assets', 'preview testing']],
      ['Front-End Mini Builds', ['profile page', 'lesson card grid', 'login form mockup', 'announcement banner', 'responsive menu']],
    ]);
  }

  function backendPlan(title) {
    return withFocus(title, [
      ['Server Responsibilities', ['receiving requests', 'sending responses', 'routing paths', 'serving JSON', 'handling errors']],
      ['API Design', ['endpoint naming', 'HTTP methods', 'status codes', 'request body', 'response shape']],
      ['Validation', ['required fields', 'type checks', 'length checks', 'safe defaults', 'friendly errors']],
      ['Authentication Flow', ['login request', 'session idea', 'token idea', 'logout behavior', 'protected route']],
      ['Authorization', ['owner checks', 'role checks', 'admin actions', 'viewer access', 'edit access']],
      ['Database Work', ['connection setup', 'query parameters', 'read operation', 'write operation', 'failed query handling']],
      ['Files and Uploads', ['upload route', 'file metadata', 'size limits', 'safe names', 'download links']],
      ['Logging and Monitoring', ['request logs', 'error logs', 'slow route checks', 'health endpoint', 'deploy logs']],
      ['Security Basics', ['input trust', 'secret handling', 'rate limiting', 'CORS care', 'safe error messages']],
      ['Backend Mini Builds', ['status API', 'profile API', 'file list API', 'announcement API', 'permission API']],
    ]);
  }

  function databasePlan(title) {
    return withFocus(title, [
      ['Data Modeling', ['entities', 'attributes', 'records', 'table purpose', 'avoiding duplicate fields']],
      ['Table Design', ['column names', 'data types', 'required fields', 'default values', 'timestamps']],
      ['Reading Data', ['SELECT columns', 'WHERE filters', 'ORDER BY sorting', 'LIMIT rows', 'search conditions']],
      ['Writing Data', ['INSERT rows', 'UPDATE rows', 'DELETE caution', 'soft delete idea', 'transaction idea']],
      ['Keys', ['primary key', 'foreign key', 'unique key', 'composite key', 'relationship checks']],
      ['Relationships', ['one-to-one', 'one-to-many', 'many-to-many', 'join table', 'referential integrity']],
      ['Query Safety', ['parameters', 'SQL injection risk', 'least columns', 'permission filters', 'audit fields']],
      ['Indexes and Speed', ['why indexes help', 'index tradeoffs', 'search columns', 'sort columns', 'slow query clues']],
      ['Data Quality', ['constraints', 'validation before save', 'consistent formats', 'nullable fields', 'cleanup checks']],
      ['Database Mini Builds', ['student table', 'folder table', 'file metadata table', 'announcement table', 'leaderboard table']],
    ]);
  }

  function deploymentPlan(title) {
    return withFocus(title, [
      ['Release Overview', ['local app vs live app', 'build step', 'start command', 'public URL', 'rollback idea']],
      ['Project Preparation', ['package scripts', 'root directory', 'environment files', 'ignored files', 'asset paths']],
      ['Environment Variables', ['public values', 'secret values', 'service keys', 'missing variable errors', 'safe rotation']],
      ['Build and Runtime', ['install step', 'build command', 'start command', 'runtime logs', 'failed deploy checks']],
      ['Static Hosting', ['HTML assets', 'cache behavior', 'relative paths', 'custom domain', '404 handling']],
      ['Server Hosting', ['web service', 'port binding', 'health route', 'background limits', 'restart behavior']],
      ['Database and Storage', ['connection URL', 'storage bucket', 'migration script', 'backup habit', 'permission check']],
      ['Monitoring', ['deploy log', 'runtime log', 'uptime ping', 'error alert', 'version banner']],
      ['Security Before Launch', ['secret scan', 'CORS review', 'admin access', 'file upload limits', 'HTTPS check']],
      ['Deployment Mini Builds', ['first deploy', 'cache-bust release', 'hotfix deploy', 'environment update', 'release notes']],
    ]);
  }

  function gitPlan(title) {
    return withFocus(title, [
      ['Repository Basics', ['working tree', 'staging area', 'commit history', 'remote repository', 'default branch']],
      ['Daily Checks', ['git status', 'git diff', 'reading changed files', 'checking branch', 'checking remote']],
      ['Saving Work', ['git add', 'focused commits', 'commit messages', 'small changesets', 'undoing before commit']],
      ['Sharing Work', ['git push', 'git pull', 'upstream branch', 'remote tracking', 'sync before editing']],
      ['Branching', ['new branch', 'switch branch', 'feature branch', 'stale branch', 'branch cleanup']],
      ['Merging', ['merge flow', 'conflict markers', 'manual conflict fix', 'merge commit', 'post-merge test']],
      ['Collaboration', ['pull request', 'review comments', 'requested changes', 'approval', 'merge strategy']],
      ['Recovery', ['restore one file', 'revert commit', 'stash basics', 'lost change prevention', 'safe history habits']],
      ['Release Habits', ['version bump', 'changelog entry', 'tag idea', 'deploy trigger', 'rollback checkpoint']],
      ['Git Mini Workflows', ['solo assignment', 'pair project', 'bugfix branch', 'documentation change', 'team release']],
    ]);
  }

  function cyberPlan(title) {
    return withFocus(title, [
      ['Threat Awareness', ['asset identification', 'attacker goal', 'common entry point', 'impact estimate', 'warning signs']],
      ['Account Protection', ['strong passwords', 'password managers', 'multi-factor authentication', 'recovery codes', 'account lockout']],
      ['Phishing Defense', ['sender checks', 'link inspection', 'urgent wording', 'fake login pages', 'safe reporting']],
      ['Secure Input', ['validation', 'sanitizing idea', 'escaping output', 'file upload checks', 'unsafe trust']],
      ['Web App Risks', ['injection', 'XSS', 'broken access control', 'sensitive data exposure', 'unsafe redirects']],
      ['Permissions', ['least privilege', 'owner access', 'viewer role', 'editor role', 'admin action review']],
      ['Safe Data Handling', ['private data', 'encryption idea', 'hashing passwords', 'logs without secrets', 'data retention']],
      ['Incident Response', ['detect issue', 'contain access', 'preserve evidence', 'notify users', 'fix root cause']],
      ['Security Testing', ['checklist review', 'abuse case', 'permission test', 'invalid input test', 'dependency review']],
      ['Cyber Mini Scenarios', ['fake email review', 'login form hardening', 'folder permission audit', 'unsafe upload fix', 'error message cleanup']],
    ]);
  }

  function networkPlan(title) {
    return withFocus(title, [
      ['Network Map', ['client device', 'local network', 'router path', 'server destination', 'response return']],
      ['Addressing', ['IP address', 'domain name', 'DNS lookup', 'ports', 'private vs public address']],
      ['Protocols', ['HTTP', 'HTTPS', 'TCP', 'UDP', 'WebSocket idea']],
      ['Requests', ['browser request', 'API request', 'headers', 'payload', 'status code']],
      ['Troubleshooting', ['ping check', 'DNS failure', 'timeout', 'connection refused', 'slow response']],
      ['Local Networks', ['router role', 'switch role', 'Wi-Fi signal', 'LAN devices', 'gateway']],
      ['Web App Connectivity', ['frontend to backend', 'backend to database', 'CORS clue', 'service URL', 'health endpoint']],
      ['Security on Networks', ['HTTPS', 'public Wi-Fi risk', 'firewall idea', 'VPN idea', 'safe sharing']],
      ['Performance', ['latency', 'bandwidth', 'caching', 'CDN idea', 'large file impact']],
      ['Networking Mini Labs', ['trace a website load', 'read API status', 'identify DNS issue', 'compare HTTP and HTTPS', 'map client-server flow']],
    ]);
  }

  function linuxPlan(title) {
    return withFocus(title, [
      ['System Orientation', ['kernel idea', 'shell idea', 'terminal prompt', 'current directory', 'home folder']],
      ['Navigation', ['pwd', 'ls', 'cd', 'relative paths', 'absolute paths']],
      ['Files and Folders', ['touch', 'mkdir', 'cp', 'mv', 'rm caution']],
      ['Viewing Content', ['cat', 'less idea', 'head', 'tail', 'grep search']],
      ['Permissions', ['owner', 'group', 'read write execute', 'chmod', 'permission denied']],
      ['Processes', ['running program', 'ps idea', 'kill caution', 'background task', 'resource check']],
      ['Package and Tools', ['package manager idea', 'installing tools', 'version check', 'PATH idea', 'missing command']],
      ['Shell Safety', ['quotes', 'spaces in paths', 'wildcards', 'destructive commands', 'dry-run habit']],
      ['Server Habits', ['logs', 'environment variables', 'service restart', 'port check', 'health command']],
      ['Linux Mini Labs', ['create project folder', 'inspect logs', 'fix permission issue', 'search files', 'prepare deploy folder']],
    ]);
  }

  function apiPlan(title) {
    return withFocus(title, [
      ['API Purpose', ['client-server contract', 'endpoint role', 'resource naming', 'request timing', 'response promise']],
      ['HTTP Methods', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']],
      ['Request Parts', ['URL', 'query string', 'headers', 'body', 'authentication header']],
      ['Response Parts', ['status code', 'JSON body', 'error shape', 'empty response', 'pagination data']],
      ['REST Habits', ['resource routes', 'plural names', 'stateless idea', 'consistent responses', 'versioning idea']],
      ['JSON Basics', ['object shape', 'array shape', 'nested data', 'null values', 'parse errors']],
      ['Testing APIs', ['browser test', 'Postman idea', 'curl idea', 'network tab', 'mock response']],
      ['API Security', ['token check', 'rate limit', 'input validation', 'permission filter', 'safe error message']],
      ['API Debugging', ['404 route', '400 bad input', '401 login needed', '500 server error', 'timeout clue']],
      ['API Mini Builds', ['profile endpoint', 'file list endpoint', 'announcement endpoint', 'leaderboard endpoint', 'search endpoint']],
    ]);
  }

  function mobilePlan(title) {
    return withFocus(title, [
      ['Mobile Context', ['small screen', 'touch input', 'device rotation', 'battery limits', 'network changes']],
      ['Screen Layout', ['safe areas', 'bottom controls', 'scrollable content', 'card density', 'portrait-first design']],
      ['Touch Controls', ['tap target size', 'hold action', 'drag action', 'gesture conflict', 'press feedback']],
      ['Android Basics', ['activity idea', 'permissions', 'resources', 'manifest idea', 'emulator testing']],
      ['Cross-Platform Thinking', ['shared code', 'native feature bridge', 'platform differences', 'build targets', 'store packaging']],
      ['Performance', ['image size', 'lazy loading', 'animation cost', 'offline cache', 'memory pressure']],
      ['Mobile Forms', ['keyboard types', 'input focus', 'validation timing', 'save button placement', 'error message visibility']],
      ['Notifications', ['permission prompt', 'push subscription', 'deep link', 'badge update', 'duplicate prevention']],
      ['Testing Devices', ['screen sizes', 'slow network', 'dark mode', 'orientation checks', 'install flow']],
      ['Mobile Mini Builds', ['login screen', 'file picker', 'chat notification', 'lesson reader', 'game control pad']],
    ]);
  }

  function uxPlan(title) {
    return withFocus(title, [
      ['User Goals', ['task definition', 'user expectation', 'success moment', 'pain point', 'context of use']],
      ['Information Layout', ['visual hierarchy', 'grouping', 'scannable headings', 'empty states', 'progress indicators']],
      ['Interaction Design', ['button states', 'hover and press feedback', 'modal behavior', 'navigation path', 'undo possibility']],
      ['Typography', ['font size', 'line height', 'readable measure', 'label wording', 'contrast']],
      ['Color', ['accent color', 'status colors', 'contrast checks', 'calm palette', 'dark mode care']],
      ['Accessibility', ['keyboard focus', 'screen reader label', 'alt text', 'touch target', 'reduced motion']],
      ['Forms', ['field order', 'helper text', 'validation timing', 'error placement', 'confirmation message']],
      ['Responsive UX', ['mobile priority', 'desktop density', 'navigation collapse', 'content stacking', 'thumb reach']],
      ['Usability Testing', ['task script', 'observe hesitation', 'collect feedback', 'fix one issue', 'retest']],
      ['UI/UX Mini Builds', ['profile card', 'settings panel', 'announcement board', 'lesson search page', 'upload flow']],
    ]);
  }

  function engineeringPlan(title) {
    return withFocus(title, [
      ['Project Planning', ['problem statement', 'requirements', 'scope boundary', 'priority order', 'acceptance check']],
      ['Design Before Code', ['data shape', 'route plan', 'component map', 'state plan', 'error flow']],
      ['Implementation Habits', ['small commits', 'clear names', 'single responsibility', 'helper functions', 'code comments']],
      ['Debugging Workflow', ['reproduce bug', 'isolate cause', 'inspect state', 'make minimal fix', 'verify regression']],
      ['Testing Strategy', ['manual test', 'unit test idea', 'integration test idea', 'edge case', 'test data']],
      ['Documentation', ['README purpose', 'setup steps', 'schema note', 'API note', 'release note']],
      ['Team Collaboration', ['task split', 'code review', 'merge timing', 'conflict handling', 'handoff note']],
      ['Maintenance', ['refactor trigger', 'dead code removal', 'dependency update', 'performance check', 'security patch']],
      ['Quality Review', ['accessibility pass', 'mobile pass', 'error state pass', 'loading state pass', 'permissions pass']],
      ['Engineering Mini Projects', ['bug report fix', 'feature checklist', 'small refactor', 'release review', 'post-deploy check']],
    ]);
  }

  function cloudPlan(title) {
    return withFocus(title, [
      ['Cloud Fundamentals', ['provider role', 'shared responsibility', 'regions', 'service types', 'billing awareness']],
      ['Hosting Models', ['static hosting', 'web service', 'serverless function', 'container idea', 'managed database']],
      ['Storage', ['object storage', 'file URL', 'bucket permission', 'upload limit', 'backup habit']],
      ['Backend Services', ['authentication service', 'database service', 'realtime service', 'queue idea', 'scheduled task']],
      ['Configuration', ['environment variables', 'secrets', 'runtime setting', 'build setting', 'service restart']],
      ['Scaling', ['traffic spike', 'horizontal scaling idea', 'cold start', 'resource limit', 'cost tradeoff']],
      ['Reliability', ['health check', 'uptime monitor', 'retry idea', 'fallback message', 'incident note']],
      ['Security', ['least privilege', 'public vs private data', 'key rotation', 'network access', 'audit log']],
      ['Observability', ['logs', 'metrics', 'traces idea', 'error grouping', 'version tracking']],
      ['Cloud Mini Builds', ['deploy static app', 'connect database', 'upload media', 'set env vars', 'monitor uptime']],
    ]);
  }

  function testingPlan(title) {
    return withFocus(title, [
      ['Bug Discovery', ['symptom', 'reproduction steps', 'expected behavior', 'actual behavior', 'environment note']],
      ['Debugging Process', ['narrow the area', 'inspect variables', 'check recent changes', 'add temporary logs', 'remove debug logs']],
      ['Console and Logs', ['console output', 'error stack', 'network log', 'server log', 'timestamp clue']],
      ['Test Types', ['manual test', 'unit test', 'integration test', 'end-to-end test', 'smoke test']],
      ['Test Data', ['normal case', 'empty case', 'invalid case', 'large case', 'permission case']],
      ['Regression Prevention', ['bug reproduction test', 'before and after check', 'edge case checklist', 'release checklist', 'rollback note']],
      ['Frontend Checks', ['responsive view', 'button click', 'loading state', 'empty state', 'error state']],
      ['Backend Checks', ['status code', 'validation error', 'database write', 'permission block', 'rate limit idea']],
      ['Debugging Mindset', ['one change at a time', 'hypothesis', 'evidence', 'root cause', 'clear fix note']],
      ['Testing Mini Labs', ['fix broken button', 'trace failed upload', 'test API response', 'verify permission', 'check mobile layout']],
    ]);
  }

  function dsaPlan(title) {
    return withFocus(title, [
      ['Problem Reading', ['input shape', 'expected output', 'constraints', 'examples', 'edge cases']],
      ['Arrays', ['index access', 'looping array', 'adding values', 'finding max', 'two-pointer idea']],
      ['Strings', ['character access', 'case handling', 'substring', 'counting characters', 'palindrome idea']],
      ['Searching', ['linear search', 'binary search idea', 'search condition', 'not found case', 'search cost']],
      ['Sorting', ['why sort', 'bubble sort idea', 'built-in sort', 'custom compare', 'sorted data use']],
      ['Stacks and Queues', ['stack push pop', 'queue enqueue dequeue', 'undo pattern', 'task line pattern', 'empty structure check']],
      ['Maps and Sets', ['key lookup', 'counting frequency', 'unique values', 'duplicate check', 'fast membership']],
      ['Algorithm Design', ['brute force', 'step improvement', 'helper function', 'trace table', 'complexity intuition']],
      ['Debugging Algorithms', ['dry run', 'off-by-one', 'wrong condition', 'empty input', 'large input']],
      ['DSA Mini Challenges', ['find duplicate', 'reverse string', 'count vowels', 'sort scores', 'match brackets']],
    ]);
  }

  function defaultPlan(title) {
    return withFocus(title, [
      ['Orientation', ['where it fits', 'student use case', 'main parts', 'first safe check', 'common confusion']],
      ['Core Skills', ['basic action', 'reading feedback', 'small configuration', 'safe edit', 'review habit']],
      ['Workflow', ['prepare task', 'perform step', 'inspect evidence', 'fix mistake', 'document result']],
      ['Project Use', ['simple project case', 'team project case', 'mobile case', 'database case', 'release case']],
      ['Safety', ['permission concern', 'input concern', 'data concern', 'rollback concern', 'user trust concern']],
      ['Troubleshooting', ['missing setup', 'wrong path', 'failed action', 'unclear message', 'slow response']],
      ['Quality', ['readability', 'consistency', 'maintainability', 'performance', 'accessibility']],
      ['Collaboration', ['handoff note', 'review step', 'naming agreement', 'version note', 'shared checklist']],
      ['Practice Patterns', ['guided edit', 'comparison check', 'small lab', 'reflection question', 'mini review']],
      ['Mini Projects', ['starter task', 'classroom task', 'debug task', 'improvement task', 'final review']],
    ]);
  }

  function planFor(title) {
    const lower = title.toLowerCase();
    if (title === 'Java') return javaPlan;
    if (title === 'HTML') return htmlPlan;
    if (title === 'CSS') return cssPlan;
    if (title === 'JavaScript') return jsPlan;
    if (title === 'Python') return pythonPlan;
    if (['ruby', 'php', 'sql', 'c', 'c++', 'c#', 'typescript'].includes(lower)) return languagePlan(title);
    if (lower.includes('web basics') || lower.includes('responsive') || lower.includes('dom') || lower.includes('react') || lower.includes('ui components')) return frontendPlan(title);
    if (lower.includes('server') || lower.includes('authentication') || lower.includes('node') || lower.includes('database connection') || title === 'APIs') return backendPlan(title);
    if (lower.includes('sql') || lower.includes('database') || lower.includes('table') || lower.includes('crud') || lower.includes('keys')) return databasePlan(title);
    if (['github','github pages','netlify','vercel','render','firebase','supabase basics'].includes(lower)) return deploymentPlan(title);
    if (lower.includes('git') || lower.includes('repositories') || lower.includes('commit') || lower.includes('push') || lower.includes('pull') || lower.includes('branch') || lower.includes('merge')) return gitPlan(title);
    if (lower.includes('cyber') || lower.includes('password') || lower.includes('phishing') || lower.includes('secure') || lower.includes('owasp')) return cyberPlan(title);
    if (lower.includes('network') || lower.includes('internet') || lower.includes('ip address') || lower.includes('dns') || lower.includes('router') || lower.includes('client')) return networkPlan(title);
    if (lower.includes('api') || lower.includes('rest') || lower.includes('json') || lower.includes('request')) return apiPlan(title);
    if (lower.includes('linux') || lower.includes('command') || lower.includes('operating') || lower.includes('os basics') || lower.includes('permissions') || lower.includes('files and directories')) return linuxPlan(title);
    if (lower.includes('mobile') || lower.includes('android') || lower.includes('cross-platform')) return mobilePlan(title);
    if (lower.includes('ui') || lower.includes('ux') || lower.includes('layout') || lower.includes('color') || lower.includes('accessibility')) return uxPlan(title);
    if (lower.includes('sdlc') || lower.includes('software') || lower.includes('documentation') || lower.includes('clean code')) return engineeringPlan(title);
    if (lower.includes('cloud') || lower.includes('hosting') || lower.includes('storage') || lower.includes('backend services')) return cloudPlan(title);
    if (lower.includes('testing') || lower.includes('debugging') || lower.includes('errors') || lower.includes('console logging')) return testingPlan(title);
    if (lower.includes('arrays') || lower.includes('strings') || lower.includes('searching') || lower.includes('sorting') || lower.includes('stack') || lower.includes('queue')) return dsaPlan(title);
    return defaultPlan(title);
  }

  function expandSubfolder(subfolder) {
    const plan = planFor(subfolder.title);
    subfolder.chapters = plan.map(([title, topics]) => chapter(subfolder.title, { title, topics }));
  }

  function exampleSignature(lesson) {
    return (lesson.examples || []).map((example) => example.demoModel || example.title || example.outputMode || example.kind).join('|');
  }

  function polishLibrary(library) {
    library.forEach((category) => {
      (category.subfolders || []).forEach((subfolder) => {
        let previousVisualSignature = '';
        let lessonCounter = 0;
        (subfolder.chapters || []).forEach((chapter) => {
          (chapter.lessons || []).forEach((lesson, index) => {
            if (['HTML', 'CSS', 'JavaScript'].includes(subfolder.title) && lesson.examples?.length) {
              let signature = exampleSignature(lesson);
              if (signature === previousVisualSignature) {
                for (let attempt = 1; attempt <= demoModels.length && signature === previousVisualSignature; attempt++) {
                  lesson.examples = examples(subfolder.title, chapter.title, lesson.title, index + lessonCounter + attempt);
                  signature = exampleSignature(lesson);
                }
                lesson.example = { title: `${lesson.title} Example`, code: lesson.examples[0]?.code || lesson.example?.code || '' };
              }
              previousVisualSignature = signature;
            }

            const exampleWords = (lesson.examples || []).flatMap((example) => [
              example.title,
              example.code,
              example.output,
              example.demoModel,
              example.explanation,
            ]);
            lesson.keywords = Array.from(new Set([
              ...(lesson.keywords || []),
              subfolder.title,
              chapter.title,
              lesson.title,
              ...(lesson.tags || []),
              ...exampleWords,
            ].filter(Boolean)));
            if (!lesson.examples || lesson.examples.length < 3) {
              lesson.examples = examples(subfolder.title, chapter.title, lesson.title, index);
              lesson.example = { title: `${lesson.title} Example`, code: lesson.examples[0]?.code || '' };
            }
          });
          lessonCounter += chapter.lessons?.length || 0;
        });
      });
    });
  }

  codingEducationalData.forEach((category) => (category.subfolders || []).forEach(expandSubfolder));
  polishLibrary(codingEducationalData);
})();

window.codingEducationalData = codingEducationalData;
