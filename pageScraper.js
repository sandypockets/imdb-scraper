const { Parser } = require('json2csv')
const fsPromises = require('fs/promises')

const scraperObject = {
  url: `https://www.imdb.com/chart/moviemeter/`,
  scrapedData: [],
  formattedData: [],
  toCsv: function(jsonData) {
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(jsonData)
    fsPromises.writeFile("./scrapedoutput.csv", csv)
      .then(() => { console.log("CSV is ready.") })
      .catch((err) => { console.error(err) })
      .finally(() => { process.exit() })
  },
  async scraper(browser) {
    let page = await browser.newPage()
    console.log(`Navigating to ${this.url}...`)
    await page.goto(this.url)
    await page.waitForSelector(".chart")
    let urls = await page.$$eval("td.titleColumn", links => {
      links = links.map(el => el.querySelector("a").href)
      return links
    })

    let pagePromise = (link) => new Promise(async(resolve, reject) => {
      let dataObj = {}
      let newPage = await browser.newPage()
      await newPage.goto(link)
      console.log(`Navigating to ${link}...`)
      await page.waitForSelector(".ipc-page-content-container")
      try {
        // Use the following regex to select classes that partially match the value
        // div[class^="value"]
        dataObj["url"] = link
        dataObj["title"] = await newPage.$eval("section.ipc-page-section h1", text => text.textContent)
        dataObj["year"] = await newPage.$eval("ul.ipc-inline-list > li:nth-child(1) > span", text => text.textContent)
        dataObj["parentalRating"] = await newPage.$eval("ul.ipc-inline-list > li:nth-child(2) > span", text => text.textContent)
        dataObj["imdbRating"] = await newPage.$eval("span[class^=\"AggregateRatingButton__RatingScore-sc-\"]", text => text.textContent)
        dataObj["plot"] = await newPage.$eval("span[class^=\"GenresAndPlot__TextContainerBreakpointXL\"]", text => text.textContent)
        dataObj["runningTime"] = await newPage.$eval("div[class^=\"TitleBlock__TitleMetaDataContainer-sc-\"] > ul > li:nth-child(3)", text => text.textContent)
        dataObj["director"] = await newPage.$eval("div[class^=\"PrincipalCredits\"] a", text => text.textContent)
        dataObj["storyline"] = await newPage.$eval("div[class^=\"Storyline__StorylineWrapper\"] > div > div > div", text => text.textContent)
        dataObj["featuredReview"] = await newPage.$eval("div span[data-testid='review-summary']", text => text.textContent)

        console.log("DEBUG - DataObj: ", dataObj) // Debugging

        // To Do
        // Need to loop over writers, top cast, trailers, photos, more like this, genres
        // Open trivia pages, goofs, quotes

      } catch (err) {
        console.log("Error: Main data scrape failed: ", err)
      }
      resolve(dataObj)
      reject(dataObj)
      await newPage.close()
    });

    for(let link in urls){
      let currentPageData = await pagePromise(urls[link])
      this.scrapedData.push(currentPageData)
    }

    console.log("Trimming strings...")
    for (let data of this.scrapedData) {
      const url = data.url
      const title = data.title
      const year = data.year
      const parentalRating = data.parentalRating
      const imdbRating = data.imdbRating
      const plot = data.plot
      const runningTime = data.runningTime
      const director = data.director
      const storyline = data.storyline
      const featuredReview = data.featuredReview

      for (let property in data) {
        if (property.valueOf().length > 0) {
          property = property.toString().trim()
        }
      }

      this.formattedData.push({
        url, title, year, parentalRating, imdbRating, plot, runningTime, director, storyline, featuredReview
      })

    }
    console.log("The CSV is being prepared...")
    this.toCsv(this.formattedData)
  }
}

module.exports = scraperObject;
