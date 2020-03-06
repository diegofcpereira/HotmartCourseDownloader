import { getSubstring, getAllSubstrings } from './utils.js';
import Decrypter from './hls.js-master/src/crypt/decrypter.js';

function getInfos(tabId) {
    return new Promise(function (resolve, reject) {
        let currentUrl;
        let currentCode;
        let template;
        let videoId;
        let videoName;
        let moduleName;
        let courseName;
        let nextVideo;

        chrome.tabs.get(tabId, function (tab) {
            currentUrl = tab.url;
            //console.log(currentUrl);
        });

        videoId = new Promise(function (resolve, reject) {
            chrome.tabs.executeScript(tabId, {
                code: 'document.getElementsByClassName("hero__section")[0].outerHTML;'
            }, function (result) {
                videoId = getSubstring(String(result), "thumbnail/", "/dimension?");
                template = "Midnight";
                if (videoId) {
                    resolve([videoId, template]);
                } else {
                    chrome.tabs.executeScript(tabId, {
                        code: 'document.getElementsByClassName("embed-responsive-item")[0].src;'
                    }, function (result) {
                        videoId = getSubstring(String(result), "embed/", "?token");
                        template = "Normal";
                        resolve([videoId, template]);
                    })
                }
            })
        })

        videoId.then(function ([videoId, template]) {
            if (template == "Normal") {
                videoName = new Promise(function (resolve, reject) {
                    chrome.tabs.executeScript(tabId, {
                        code: 'document.getElementsByClassName("\\\nnavigation-page navigation-page-active")[0].innerText;'
                    }, function (result) {
                        resolve(result);
                    })
                })

                moduleName = new Promise(function (resolve, reject) {
                    chrome.tabs.executeScript(tabId, {
                        code: 'document.getElementsByClassName("\\\nnavigation-page navigation-page-active")[0].parentNode.parentNode.getElementsByClassName("navigation-module-title")[0].innerText;'
                    }, function (result) {
                        resolve(result);
                    })
                })

                courseName = new Promise(function (resolve, reject) {
                    chrome.tabs.executeScript(tabId, {
                        code: 'document.getElementsByClassName("navigation-menu-logo")[0].innerText;'
                    }, function (result) {
                        resolve(result);
                    })
                })

                nextVideo = new Promise(function (resolve, reject) {
                    chrome.tabs.executeScript(tabId, {
                        code: 'document.getElementsByClassName("\\\nnavigation-page navigation-page-active")[0].nextElementSibling.dataset.pageHash;'
                    }, function (result) {
                        if (result[0]) {
                            //console.log("caso 1 - mudança de video")
                            resolve(result);
                        }
                        else {
                            chrome.tabs.executeScript(tabId, {
                                code: 'document.getElementsByClassName("\\\nnavigation-page navigation-page-active")[0].parentElement.parentElement.nextElementSibling.getElementsByClassName("card-body navigation-module-pages collapse")[0].firstElementChild.dataset.pageHash;'
                            }, function (result) {
                                if (result[0]) {
                                    //console.log("caso 2 - mudança de modulo")
                                    resolve(result);
                                }
                                else {
                                    //console.log("caso 3 - fim")
                                    resolve("End");
                                }
                            })
                        }
                    })
                })

                currentCode = new Promise(function (resolve, reject) {
                    chrome.tabs.executeScript(tabId, {
                        code: 'document.getElementsByClassName("\\\nnavigation-page navigation-page-active")[0].dataset.pageHash;'
                    }, function (result) {
                        resolve(result);
                    })
                })
            } else if (template == "Midnight") {
                videoName = new Promise(function (resolve, reject) {
                    chrome.tabs.executeScript(tabId, {
                        code: 'document.getElementsByClassName("navigation__page--standard  navigation__page--active")[0].innerText;'
                    }, function (result) {
                        resolve(result);
                    })
                })

                moduleName = new Promise(function (resolve, reject) {
                    chrome.tabs.executeScript(tabId, {
                        code: 'document.getElementsByClassName("navigation__page--standard  navigation__page--active")[0].parentNode.parentNode.parentNode.getElementsByClassName("navigation__module__title")[0].innerText;'
                    }, function (result) {
                        resolve(result);
                    })
                })

                courseName = new Promise(function (resolve, reject) {
                    chrome.tabs.executeScript(tabId, {
                        code: 'document.getElementsByClassName("logo btn--effect sidebar__logo")[0].children[0].alt;'
                    }, function (result) {
                        resolve(result);
                    })
                })

                nextVideo = new Promise(function (resolve, reject) {
                    chrome.tabs.executeScript(tabId, {
                        code: 'document.getElementsByClassName("navigation__page--standard  navigation__page--active")[0].nextElementSibling.children[0].children[0].pathname;'
                    }, function (result) {
                        if (result[0]) {
                            //console.log("caso 1 - mudança de video")
                            resolve(result);
                        }
                        else {
                            chrome.tabs.executeScript(tabId, {
                                code: 'document.getElementsByClassName("navigation__page--standard  navigation__page--active")[0].parentNode.parentNode.parentNode.nextElementSibling.getElementsByClassName("navigation__page--standard ")[0].firstElementChild.firstElementChild.pathname'
                            }, function (result) {
                                if (result[0]) {
                                    //console.log("caso 2 - mudança de modulo")
                                    resolve(result);
                                }
                                else {
                                    //console.log("caso 3 - fim")
                                    resolve("End");
                                }
                            })
                        }
                    })
                })

                currentCode = new Promise(function (resolve, reject) {
                    chrome.tabs.executeScript(tabId, {
                        code: 'document.getElementsByClassName("navigation__page--standard  navigation__page--active")[0].firstElementChild.firstElementChild.pathname;'
                    }, function (result) {
                        resolve(result);
                    })
                })
            }

            Promise.all([videoName, moduleName, courseName, nextVideo, currentCode]).then(function ([videoName, moduleName, courseName, nextVideo, currentCode]) {
                // console.log("------");
                // console.log(currentUrl)
                // console.log(currentCode)
                // console.log(nextVideo)
                if (nextVideo != "End") {
                    nextVideo = currentUrl.replace(currentCode, nextVideo);
                }
                // console.log(nextVideo);
                resolve([videoId, videoName, moduleName, courseName, nextVideo, currentCode, currentUrl, template]);
            })
        })

    })
}

function getVideoQualities(videoId) {
    return new Promise(function (resolve, reject) {
        let httpReq = new XMLHttpRequest();
        httpReq.onreadystatechange = function () {
            if (httpReq.readyState == 4 && httpReq.status == 200) {
                let qualities = getAllSubstrings(String(httpReq.responseText), '/', '\\.');
                let i;
                for(i = 0; i<qualities.length; i++) {
                    if(Number(qualities[i]) >= 720) {
                        resolve(qualities[i]);
                    }
                }
                resolve(qualities[i-1]);
            }
        };
        httpReq.open("GET", `https://contentplayer.hotmart.com/video/${videoId}/hls/master.m3u8`, true);
        httpReq.send();
    })
}

function getVideoPlaylist(videoId, videoQuality) {
    return new Promise(function (resolve, reject) {
        let httpReq = new XMLHttpRequest();
        httpReq.onreadystatechange = function () {
            if (httpReq.readyState == 4 && httpReq.status == 200) {
                resolve(String(httpReq.responseText));
            }
        };
        httpReq.open("GET", `https://contentplayer.hotmart.com/video/${videoId}/hls/${videoQuality}/${videoQuality}.m3u8`)
        httpReq.send();
    })
}

function getKey(videoId, videoQuality, videoPlaylist) {
    return new Promise(function (resolve, reject) {
        let keyId = getSubstring(videoPlaylist, 'URI="', '.key');
        //console.log(keyId)
        let httpReq = new XMLHttpRequest();
        httpReq.onreadystatechange = function () {
            if (httpReq.readyState == 4 && httpReq.status == 200) {
                let fReader = new FileReader();
                fReader.readAsArrayBuffer(httpReq.response);
                fReader.onload = function (e) {
                    if (fReader.readyState == 2) {
                        resolve(fReader.result);
                    }
                };
            }
        };
        httpReq.open("GET", `https://contentplayer.hotmart.com/video/${videoId}/hls/${videoQuality}/${keyId}.key`);
        httpReq.responseType = 'blob';
        //httpReq.overrideMimeType('text/xml; charset=UTF-8');
        httpReq.send();
    })
}

function getSegment(segmentLink) {
    return new Promise(function (resolve, reject) {
        let httpReq = new XMLHttpRequest();
        httpReq.onreadystatechange = function () {
            if (httpReq.readyState == 4 && httpReq.status == 200) {
                let fReader = new FileReader();
                fReader.readAsArrayBuffer(httpReq.response);
                fReader.onload = function (e) {
                    if (fReader.readyState == 2) {
                        resolve(fReader.result);
                    }
                }
            }
        };
        httpReq.open("GET", `${segmentLink}`);
        httpReq.responseType = 'blob';
        //httpReq.overrideMimeType('text/xml; charset=UTF-8');
        httpReq.send();
    })
}

function getSegmentList(videoId, videoQuality, videoPlaylist) {
    return new Promise(function (resolve, reject) {
        let segmentList = getAllSubstrings(String(videoPlaylist), "segment-", ".ts");
        for (let i = 0; i < segmentList.length; i++) {
            segmentList[i] = `https://contentplayer.hotmart.com/video/${videoId}/hls/${videoQuality}/segment-${i}.ts`;
        }
        resolve(segmentList);
    })
}

function decrypt(segment, key) {
    return new Promise(function (resolve, reject) {
        let dec = new Decrypter();
        dec.decryptBySoftware(new Int32Array(segment), new Uint8Array(key), "0", function (callback) {
            //console.log(callback);
            resolve(callback);
        })
    })
}

function doAgain(currentTab) {
    console.log("Waiting for the page to load...")
    setTimeout(function () {
        console.clear();
        getInfos(currentTab).then(function ([videoId, videoName, moduleName, courseName, nextVideo, currentCode, currentUrl, template]) {
            //console.log(courseName+"/"+moduleName+"/"+videoName);
            //console.log(videoId+" - "+currentUrl+" - "+currentCode)
            //console.log(template)
            //console.log(nextVideo);
            getVideoQualities(videoId).then(function (videoQuality) {
                //console.log(videoQuality);
                getVideoPlaylist(videoId, videoQuality).then(function (videoPlaylist) {
                    //console.log(videoPlaylist);
                    getKey(videoId, videoQuality, videoPlaylist).then(function (videoKey) {
                        //console.log(videoKey);
                        getSegmentList(videoId, videoQuality, videoPlaylist).then(function (segmentList) {
                            //console.log(segmentList);

                            let finalBlob = new Blob([], { type: 'video/mp4' });
                            courseName = String(courseName).replace(/[\\\/\:\*\?\"\<\>\|]/g, " -");
                            moduleName = String(moduleName).replace(/[\\\/\:\*\?\"\<\>\|]/g, " -");
                            videoName = String(videoName).replace(/[\\\/\:\*\?\"\<\>\|]/g, " -");
                            let filename = String(`${courseName}/${moduleName}/${videoName}.mp4`).replace(/(\s){2,}/g, " ")


                            for (let i = 0, p = Promise.resolve(); i < segmentList.length; i++) {
                                p = p.then(() => (
                                    getSegment(segmentList[i]).then(function (segment) {
                                        decrypt(segment, videoKey).then(function (decSeg) {
                                            if (!(i % 10)) { console.clear() }
<<<<<<< HEAD
=======

                                            //finalBlob = new Blob([decSeg], { type: 'video/mp4' });
                                            //let url = URL.createObjectURL(finalBlob);
                                            //chrome.downloads.download({ url: url, filename: filename, saveAs: false });

>>>>>>> f6f48f887125566d0f4fca9bc7b5a362b376ac7c
                                            finalBlob = new Blob([finalBlob, decSeg], { type: 'video/mp4' });
                                            console.log(`${filename} - ${videoQuality}p\n${i + 1}/${segmentList.length} - ${(finalBlob.size / 1000000).toFixed(2)} MB`);
                                            
                                            if (i == segmentList.length - 1) {
                                                let url = URL.createObjectURL(finalBlob);
                                                chrome.downloads.download({ url: url, filename: filename, saveAs: false });
                                                console.clear();
                                                console.log(filename);
                                                console.log(url)
                                                console.log("Downloaded!")
                                                
                                                if (nextVideo != "End") {
                                                    chrome.tabs.update(currentTab, { url: nextVideo });
                                                    console.log("Going to the next one...");

                                                    videoId = undefined;
                                                    videoName = undefined;
                                                    moduleName = undefined;
                                                    courseName = undefined;
                                                    nextVideo = undefined;
                                                    currentCode = undefined;
                                                    currentUrl = undefined;
                                                    template = undefined;
                                                    videoQuality = undefined;
                                                    videoPlaylist = undefined;
                                                    videoKey = undefined;
                                                    segmentList = undefined;
                                                    segment = undefined;
                                                    decSeg = undefined;
                                                    finalBlob = new Blob([]);
                                                    filename = undefined;
                                                    i = undefined;
                                                    p = undefined;
                                                    url = undefined;

                                                    doAgain(currentTab);
                                                } else {
                                                    videoId = undefined;
                                                    videoName = undefined;
                                                    moduleName = undefined;
                                                    courseName = undefined;
                                                    nextVideo = undefined;
                                                    currentCode = undefined;
                                                    currentUrl = undefined;
                                                    template = undefined;
                                                    videoQuality = undefined;
                                                    videoPlaylist = undefined;
                                                    videoKey = undefined;
                                                    segmentList = undefined;
                                                    segment = undefined;
                                                    decSeg = undefined;
                                                    finalBlob = new Blob([]);
                                                    filename = undefined;
                                                    i = undefined;
                                                    p = undefined;
                                                    url = undefined;
                                                    console.log("End of the course!");
                                                    return;
                                                }   
                                            }
                                        })
                                    })
                                ))
                            }
                        })
                    });
                });
            })
        })
    }, 10000);
}

let isRunning = false;
console.log("The extension is not running.")

chrome.browserAction.onClicked.addListener(function (tab) {
    if (!isRunning) {
        console.clear();
        console.log("Extension is running now.")
        isRunning = true;
        let currentTab = tab.id;
        doAgain(currentTab);
    }
    else {
        chrome.runtime.reload();
    }
})
