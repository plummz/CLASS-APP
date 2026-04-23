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
    category('Networking Basics', 'Understand how devices and web apps communicate.', img.network, ['Internet Basics','IP Address','DNS','Routers and Switches','Client and Server'].map((name) => subfolder(name, `${name} in simple networking terms.`, img.network, simpleLessons(id(name), 'Networking', ['Meaning', 'Use', 'Troubleshooting'], [source.mdn, source.linux], 'ping example.com', name)))),
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
    return 'concept -> example -> result';
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
    return `${topic}`;
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
    const topicNudge = hashText(topic) % 2;
    const start = (chapterSeed + (lessonIndex || 0) * 3 + topicNudge) % demoModels.length;
    return [0, 1, 2].map((offset) => demoModels[(start + offset) % demoModels.length]);
  }

  function htmlExample(topic, model, variant) {
    if (model.name === 'navbar') return `<nav class="demo-nav" aria-label="${topic} navigation"><a href="#home">Home</a><a href="#${slug(topic)}">${topic}</a><a href="#help">Help</a></nav>`;
    if (model.name === 'form') return `<form class="demo-form"><label>${topic} input <input placeholder="Type a value"></label><button type="button">Submit</button></form>`;
    if (model.name === 'gallery') return `<section class="demo-gallery"><figure>${topic} 1</figure><figure>${topic} 2</figure><figure>${topic} 3</figure></section>`;
    if (model.name === 'table') return `<div class="demo-table-wrap"><table class="demo-table"><tr><th>Topic</th><th>Status</th></tr><tr><td>${topic}</td><td>Learning</td></tr></table></div>`;
    if (model.name === 'hero') return `<section class="demo-hero"><h2>${topic}</h2><p>This hero section introduces the lesson clearly.</p><button>Start</button></section>`;
    if (variant === 2) return `<article class="demo-profile"><div class="avatar">${topic.charAt(0)}</div><h3>${topic}</h3><p>Practice profile layout.</p></article>`;
    if (variant === 3) return `<section class="demo-banner"><strong>${topic}:</strong> This banner highlights a short message.</section>`;
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

  function consoleExampleSet(moduleTitle, topic) {
    const safe = topic.replace(/["`]/g, '').replace(/\s+/g, ' ').trim();
    const m = moduleTitle.toLowerCase();
    if (m.includes('java') && !m.includes('javascript')) {
      return [
        {
          title: `${topic}: Java console output`,
          code: `public class Main {\n  public static void main(String[] args) {\n    int score = 95;\n    System.out.println("${safe}");\n    System.out.println(score);\n  }\n}`,
          outputMode: 'console',
          output: `${safe}\n95`,
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
          title: `${topic}: Java loop result`,
          code: `public class Main {\n  public static void main(String[] args) {\n    for (int count = 1; count <= 3; count++) {\n      System.out.println("${safe} " + count);\n    }\n  }\n}`,
          outputMode: 'console',
          output: `${safe} 1\n${safe} 2\n${safe} 3`,
          explanation: `This loop prints three console lines. It is intentionally console-based because Java fundamentals normally produce terminal output, not webpage previews.`,
        },
      ];
    }
    if (m.includes('python')) {
      return [
        {
          title: `${topic}: Python print output`,
          code: `topic = "${safe}"\nscore = 95\nprint(topic)\nprint(score)`,
          outputMode: 'console',
          output: `${safe}\n95`,
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
          title: `${topic}: Python loop result`,
          code: `topic = "${safe}"\nfor count in range(1, 4):\n    print(topic + " " + str(count))`,
          outputMode: 'console',
          output: `${safe} 1\n${safe} 2\n${safe} 3`,
          explanation: `This loop example shows repeated console output instead of a webpage preview.`,
        },
      ];
    }
    if (m.includes('sql') || m.includes('database')) {
      return [
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
          title: `${topic}: SQL alias result`,
          code: `SELECT '${safe}' AS topic;`,
          outputMode: 'table',
          output: 'A one-row table with an alias column.',
          explanation: `This shows how SQL can return a labeled value. The output is a table because SQL results are normally rows and columns.`,
        },
      ];
    }
    return [
      {
        title: `${topic}: terminal practice`,
        code: codeFor(moduleTitle, topic),
        outputMode: 'console',
        output: resultFor(moduleTitle, topic),
        explanation: `This command-style example belongs in a console output panel because it represents terminal practice.`,
      },
      {
        title: `${topic}: second command`,
        code: codeFor(moduleTitle, `${topic} with a second value`),
        outputMode: 'console',
        output: resultFor(moduleTitle, `${topic} with a second value`),
        explanation: `This variation changes the command target so the simulated terminal response is tied to the current code.`,
      },
      {
        title: `${topic}: classroom check`,
        code: codeFor(moduleTitle, `${topic} classroom check`),
        outputMode: 'console',
        output: resultFor(moduleTitle, `${topic} classroom check`),
        explanation: `This keeps non-visual lessons in a console-style workspace instead of forcing a browser preview.`,
      },
    ];
  }

  function examples(moduleTitle, chapterTitle, topic, lessonIndex = 0) {
    const kind = kindFor(moduleTitle);
    if (!['html', 'css', 'javascript'].includes(kind)) {
      return consoleExampleSet(moduleTitle, topic).map((example) => ({
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
    const breakdown = (customItems && customItems.length ? customItems : [
      item('Purpose', `${topic} solves a specific beginner problem in ${moduleTitle}.`, syntaxFor(moduleTitle, topic), resultFor(moduleTitle, topic)),
      item('Syntax Pattern', `The syntax shows the order of words, symbols, or values used by ${topic}.`, syntaxFor(moduleTitle, topic), resultFor(moduleTitle, topic)),
      item('Result Check', `The result tells you whether ${topic} was used correctly.`, codeFor(moduleTitle, topic), resultFor(moduleTitle, topic)),
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
      summary: `${topic} explains a concrete skill in ${moduleTitle}: what it does, why developers use it, and how it changes the final result. It belongs to the ${chapterTitle} chapter, so it connects to nearby lessons instead of standing alone. Think of it like learning one classroom tool: you do not only name it, you learn when to pick it up and how to check if it worked.`,
      overview: `${topic} appears often in real student projects and classroom exercises. It is used because software needs clear instructions, predictable structure, and results that can be checked. A simple analogy is a school form: each field has a purpose, and if one field is written incorrectly, the whole form becomes harder to use. This lesson explains what ${topic} does, why it matters, and how it affects output or behavior. The examples are different on purpose so you can compare results instead of memorizing one pattern.`,
      termsToKnow: [
        { term: 'Syntax', definition: 'The exact writing pattern that the language, browser, command, or query expects.' },
        { term: 'Value', definition: 'The text, number, setting, command, or data being used.' },
        { term: 'Result', definition: 'What appears after the code, markup, command, or query runs.' },
      ],
      detailedExplanation: [
        `${topic} should be studied as a small tool with a purpose, a pattern, and a visible or readable result. The purpose tells you why it exists. The pattern tells you how to write it. The result tells you whether the computer, browser, terminal, or database understood your instruction.`,
        `In ${moduleTitle}, many errors happen because a student copies syntax without checking meaning. A stronger habit is to predict the result before running the example. When the actual result is different, compare spelling, punctuation, order, and values, just like checking each step of a math solution.`,
        `Use this lesson like a textbook page with a small lab beside it. Read the breakdown first, edit the examples second, and then explain the output in your own words. That explanation is what turns a copied example into real understanding.`,
      ],
      breakdown,
      syntax: syntaxFor(moduleTitle, topic),
      keyPoints: [
        `${topic} has a clear purpose in ${moduleTitle}.`,
        'Small syntax details matter because one missing symbol can change the result.',
        'You should run at least three examples before moving on.',
        'The output or visual result is part of the lesson, not an extra step.',
      ],
      example: { title: `${topic} Example`, code: lessonExamples[0].code },
      examples: lessonExamples,
      outputExplanation: [
        `The result shows whether ${topic} was written correctly. Text output should match the expected words or values. Visual output should show the exact difference described by the lesson, such as new alignment, spacing, color, content, or a terminal/table result.`,
        `If the result is wrong, compare the syntax and values with the examples. Debug one small change at a time so the cause becomes easier to find, the same way you would isolate one wrong answer in a worksheet.`,
      ],
      whyThisWorks: [
        `${topic} works because ${moduleTitle} follows strict rules: the tool reads the instruction, applies it to the selected data or element, and then produces an output.`,
        `The preview/check area helps because it turns an abstract rule into something visible. Students can edit the code, watch the result change, and connect cause to effect.`,
      ],
      exercise: {
        prompt: `Guided task: edit one example so it still demonstrates ${topic}, then include the word "${topic.split(' ')[0]}" in your answer. Explain what changed in one sentence.`,
        starter: `I changed ${topic} by `,
        expected: [topic.split(' ')[0].toLowerCase()],
      },
      commonMistakes: [
        `Using ${topic} without knowing what result it should create.`,
        'Forgetting capitalization, quotes, brackets, semicolons, indentation, or the correct order of values.',
      ],
      recap: `${topic} is part of the ${moduleTitle} foundation. You should know the terms, syntax, examples, result, and common mistakes before continuing.`,
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

  const genericNames = ['Foundations','Syntax and Structure','Core Concepts','Common Commands','Project Workflow','Debugging','Security and Safety','Collaboration','Best Methods','Mini Projects'];
  function genericPlan(title, extras = []) {
    return genericNames.map((name, index) => [name, [`${title} ${name} Meaning`, `${title} ${name} Vocabulary`, `${title} ${name} Syntax`, `${title} ${name} Example Reading`, `${title} ${name} Guided Mini Task`, ...(index === 0 ? extras : [])]]);
  }

  function planFor(title) {
    const lower = title.toLowerCase();
    if (title === 'Java') return javaPlan;
    if (title === 'HTML') return htmlPlan;
    if (title === 'CSS') return cssPlan;
    if (title === 'JavaScript') return jsPlan;
    if (title === 'Python') return pythonPlan;
    if (lower.includes('sql')) return genericPlan(title, ['SELECT','WHERE','INSERT','UPDATE','DELETE','PRIMARY KEY','FOREIGN KEY','JOIN','GROUP BY','ORDER BY']);
    if (lower.includes('git')) return genericPlan(title, ['git init','git status','git add','git commit','git push','git pull','branch','merge','remote','conflict']);
    if (lower.includes('cyber') || lower.includes('password') || lower.includes('phishing') || lower.includes('secure') || lower.includes('owasp')) return genericPlan(title, ['password safety','phishing','MFA','OWASP','input validation','XSS','SQL injection','least privilege']);
    if (lower.includes('network') || lower.includes('internet') || lower.includes('ip address') || lower.includes('dns') || lower.includes('router') || lower.includes('client')) return genericPlan(title, ['IP address','DNS','router','switch','HTTP','HTTPS','TCP','UDP','client','server']);
    if (lower.includes('api') || lower.includes('rest') || lower.includes('json') || lower.includes('request')) return genericPlan(title, ['API','REST','endpoint','request','response','JSON','status code','GET','POST']);
    if (lower.includes('database') || lower.includes('table') || lower.includes('crud') || lower.includes('keys')) return genericPlan(title, ['table','record','column','primary key','foreign key','CRUD','relationship','index']);
    if (lower.includes('linux') || lower.includes('command') || lower.includes('operating') || lower.includes('permissions')) return genericPlan(title, ['pwd','ls','cd','mkdir','chmod','permissions','sudo','path']);
    if (lower.includes('cloud') || lower.includes('hosting') || lower.includes('storage') || lower.includes('backend services')) return genericPlan(title, ['cloud','hosting','storage','serverless','region','scaling','environment variables','monitoring']);
    return genericPlan(title);
  }

  function expandSubfolder(subfolder) {
    const plan = planFor(subfolder.title);
    subfolder.chapters = plan.map(([title, topics]) => chapter(subfolder.title, { title, topics }));
  }

  codingEducationalData.forEach((category) => (category.subfolders || []).forEach(expandSubfolder));
})();

window.codingEducationalData = codingEducationalData;
