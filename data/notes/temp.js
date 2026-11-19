const axios = require('axios');
const FormData = require('form-data');
const cheerio = require('cheerio');

const __VIEWSTATE = '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';

const __EVENTVALIDATION = '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';

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const today = new Date();
const twoWeeksAgo = new Date();
twoWeeksAgo.setDate(today.getDate() - 14);

const startMonth = monthNames[twoWeeksAgo.getMonth()];
const startDay = String(twoWeeksAgo.getDate());
const startYear = String(twoWeeksAgo.getFullYear());

const endMonth = monthNames[today.getMonth()];
const endDay = String(today.getDate());
const endYear = String(today.getFullYear());

const data = new FormData();
data.append('__VIEWSTATE', __VIEWSTATE);
data.append('__EVENTVALIDATION', __EVENTVALIDATION);
data.append('ctl00$ctl00$cphContainer$cpContent$ddlStartMonth', startMonth);
data.append('ctl00$ctl00$cphContainer$cpContent$ddlStartDate', startDay);
data.append('ctl00$ctl00$cphContainer$cpContent$ddlStartYear', startYear);
data.append('ctl00$ctl00$cphContainer$cpContent$ddlEndMonth', endMonth);
data.append('ctl00$ctl00$cphContainer$cpContent$ddlEndDay', endDay);
data.append('ctl00$ctl00$cphContainer$cpContent$ddlEndYear', endYear);
data.append('ctl00$ctl00$cphContainer$cpContent$ddlSelectGame', '8');
data.append('ctl00$ctl00$cphContainer$cpContent$btnSearch', 'Search Lotto');

const config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://www.pcso.gov.ph/searchlottoresult.aspx',
  headers: {
    'Cookie': 'ASP.NET_SessionId=uirdg0corgfarzd5tqep43g3',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.pcso.gov.ph/SearchLottoResult.aspx',
    'Origin': 'https://www.pcso.gov.ph',
    ...data.getHeaders()
  },
  data: data,
  validateStatus: () => true
};

const response = await axios.request(config);

if (response.status !== 200) {
  return [{ json: { error: true, status: response.status } }];
}

const $ = cheerio.load(response.data);
const results = [];

$('#cphContainer_cpContent_GridView1 tr').each((i, row) => {
  const cells = $(row).find('td');
  if (cells.length === 5) {
    results.push({
      game: $(cells[0]).text().trim(),
      combination: $(cells[1]).text().trim(),
      drawDate: $(cells[2]).text().trim(),
      jackpot: $(cells[3]).text().trim(),
      winners: $(cells[4]).text().trim()
    });
  }
});

if (results.length === 0) {
  return [{ json: { message: 'No results found', startDate: `${startMonth} ${startDay}, ${startYear}`, endDate: `${endMonth} ${endDay}, ${endYear}` } }];
}

return results.map(r => ({ json: r }));