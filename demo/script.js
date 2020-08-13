const range = (start, end) => Array.from({ length: (end + 1) - start }, (v, i) => i + start)

const articles = document.querySelector('.articles')
const article = document.querySelector('article-card')

range(2, 7).forEach(n => {
  const section = document.createElement('section')

  range(1, n).forEach(() => section.appendChild(article.cloneNode(true)))

  articles.appendChild(section)
})
