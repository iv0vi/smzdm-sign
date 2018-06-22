/**
 * 什么值得买签到程序 
 * 支持自动签到，自动评论3条，自动错误邮件提醒
 * xuess<wuniu2010@126.com>
 */

const request = require('./lib/request_https');
const cheerio = require("cheerio"); //文档转换
const schedule = require("node-schedule"); //定时器
const { currentDate, getRandom, ascii2native } = require('./lib/utils'); //工具类
const { cookieListValKey, commitList } = require("./config"); //配置文件

console.log(currentDate(), '什么值得买 启动');


//日志信息
let logoInfoCommit = [];
let logoInfoSign = [];

//文章列表 默认
let postIdList = [ '9350354',  '9328133',  '9328024',  '9350282',  '9350254',  '9328044',  '9350219',  '9350181',  '9350166',  '9343266',  '9350093',  '9350065',  '9350031',  '9349991',  '9349977',  '9349974',  '9349943',  '9349901',  '9349892',  '9349732' ];

//评论地址 
//家居生活 发现频道 300 - 550 页 随机页数
let getCommitUrl = () => {
	let random = getRandom(300, 550);
	let commitUrl = `https://faxian.smzdm.com/h1s0t0f37c0p${random}/`;
	return commitUrl;
}

/**
 * 什么值得买 获取用来评论的文章id
 * @param {Object} url 需要访问的url
 * @param {Object} refererUrl 来源url
 * @param {Object} cookieSess 用来请求的 cookie
 */
let getPostID = (url, refererUrl, cookieSess = '') => {
	//如果没传值 随机取一个cookie 防止重复提交
	let cookie = cookieSess || cookieListValKey[getRandom(0, cookieListValKey.length - 1)].cookies;
	let referer = refererUrl;
	let options = {
		url: url,
		type: 'GET'
	}
	new Promise(function(resolve, reject) {
		options.callback = function(data, _setCookie) {
			//临时列表
			let tempPostIdList = [];
			try {
				let $ = cheerio.load(data);
				$('.feed-ver-pic').each(function(i, e) {
					let href = $(e).find('a').eq(0).attr('href');
					tempPostIdList.push(href.substring(href.indexOf('/p/') + 3, href.length - 1));
				});
				//获取新列表，再更新，否则不更新
				if(tempPostIdList.length > 0){
					postIdList = tempPostIdList;
				}
			} catch(error) {
				console.log(currentDate(), '获取文章列表报错');
			} finally {}
		}
		request(options, cookie, referer);
	});
}

/**
 * 什么值得买 评论
 * @param {Object} cookieSess cookie信息
 */
let smzdmCommit = (cookieSess) => {
	//	let num = Math.floor(Math.random() * 900);
	let cookie = cookieSess.cookies;
	let cookieName = cookieSess.username;
	let referer = 'https://zhiyou.smzdm.com/user/submit/';
	let pId = postIdList[Math.floor(Math.random() * postIdList.length)];
	let options = {
		url: 'https://zhiyou.smzdm.com/user/comment/ajax_set_comment?callback=jQuery111006551744323225079_' + new Date().getTime() + '&type=3&pid=' + pId + '&parentid=0&vote_id=0&vote_type=&vote_group=&content=' + encodeURI(commitList[Math.floor(Math.random() * commitList.length)]) + '&_=' + new Date().getTime(),
		type: 'GET'
	}

	new Promise((resolve, reject) => {
		options.callback = (data, _setCookie) => {
			try {
				if(data.indexOf('"error_code":0') != -1) {
					console.log(currentDate(), '评论成功');
					//记录评论日志
					let logInfo = {};
					logInfo.cookie = cookieSess.username;
					logInfo.date = new Date().Format("yyyy-MM-dd hh:mm:ss");
					logInfo.data = ascii2native(data);
					let logJson = JSON.parse(`{${data.substring(data.indexOf('"error_msg"')+13,data.indexOf('"head"')-1)}}`)
					logInfo.jsonData = logJson;
					logInfo.pId = pId;
					logoInfoCommit.push(logInfo);
					
				} else {
					console.log(currentDate(), '评论报错: ', data);
				}

			} catch(error) {
				console.log(currentDate(), '评论报错');
			} finally {}

		}
		request(options, cookie, referer);
	});
}

/**
 * 什么值得买签到  
 * @param {Object} cookieSess
 */
let smzdmSign = (cookieSess) => {
	let cookie = cookieSess.cookies;
	let cookieName = cookieSess.username;
	let referer = 'http://www.smzdm.com/qiandao/';
	let options = {
		url: 'https://zhiyou.smzdm.com/user/checkin/jsonp_checkin?callback=jQuery112409568846254764496_' + new Date().getTime() + '&_=' + new Date().getTime(),
		type: 'GET'
	}

	new Promise((resolve, reject) => {
		options.callback = (data, _setCookie) => {
			try {
				if(data.indexOf('"error_code":0') != -1) {
					console.log(currentDate(), '签到成功');
					//记录签到日志
					let logInfo = {};
					logInfo.cookie = cookieSess.username;
					logInfo.date = new Date().Format("yyyy-MM-dd hh:mm:ss");
					logInfo.data = ascii2native(data);
					let resJson = JSON.parse(`{${data.substring(data.indexOf('"add_point"'),data.indexOf('"slogan"')-1)}}`)
					logInfo.jsonData = resJson;
					logoInfoSign.push(logInfo);
				} else {
					console.log(currentDate(), '签到报错: ', data);
				}
			} catch(error) {
				console.log(currentDate(), '签到报错');
			} finally {}
		}
		request(options, cookie, referer);
	});

}

//延迟执行签到
let setTimeSmzdmSign = (cookieSess) => {
	setTimeout(() => {
		//签到
		console.log(currentDate(), '开始签到');
		smzdmSign(cookieSess);
		}, getRandom(1000, 100000));
}

//评论三次 执行时间自定
let commitSettimeout = (cookieSess, timeNum = 1) => {
	if(timeNum == 4) {
		return;
	}
	//延迟发评论
	setTimeout(() => {
		//发现频道 最新
		getPostID(getCommitUrl(), 'https://www.smzdm.com/jingxuan/', cookieSess.cookies);
		setTimeout(() => {
			console.log(currentDate(), '评论第', timeNum, '次');
			smzdmCommit(cookieSess);
		}, 5000);
		}, getRandom(5000, 10000));

	setTimeout(() => {
		timeNum++;
		commitSettimeout(cookieSess, timeNum);
	}, getRandom(10000, 200000) * getRandom(20, 30));

}

//每天6点10执行 签到和评论
schedule.scheduleJob('30 10 6 * * *', () => {
	//发现频道 最新
	console.log('----------', currentDate(), '----------');
	getPostID(getCommitUrl(), 'https://www.smzdm.com/jingxuan/');
	for(let i = 0; i < cookieListValKey.length; i++) {
		let cookieSess = cookieListValKey[i];
		//延迟签到
		setTimeSmzdmSign(cookieSess);
		//发表三次评论
		commitSettimeout(cookieSess);
	}
});
