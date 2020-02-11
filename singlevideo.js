import Decrypter from './hls.js-master/src/crypt/decrypter.js';
import { getAllSubstrings, getSubstring } from './utils.js';

function getVideoId(tabId) {
    return new Promise(function (resolve, reject) {
        let videoId;
        chrome.tabs.executeScript(tabId, {
            code: 'document.getElementsByClassName("hero__section")[0].outerHTML;'
        },
            function (result) {
                videoId = getSubstring(String(result), "thumbnail/", "/dimension?");
                if (videoId) {
                    resolve([videoId, "Midnight"]);
                }
                else {
                    chrome.tabs.executeScript(tabId, {
                        code: 'document.getElementsByClassName("embed-responsive-item")[0].src;'
                    },
                        function (result) {
                            videoId = getSubstring(String(result), "embed/", "?token");
                            resolve([videoId, "Normal"]);
                        })
                }
            })
    });
}

function getVideoQualities(videoId) {
    return new Promise(function (resolve, reject) {
        let httpReq = new XMLHttpRequest();
        httpReq.onreadystatechange = function () {
            if (httpReq.readyState == 4 && httpReq.status == 200) {
                resolve(getAllSubstrings(String(httpReq.responseText), '/', '\\.'));
            }
        };
        httpReq.open("GET", `https://contentplayer.hotmart.com/video/${videoId}/hls/master.m3u8`, true);
        httpReq.send();
    })
}

function getVideoPlaylist(videoId, videoQualities) {
    return new Promise(function (resolve, reject) {
        let httpReq = new XMLHttpRequest();
        httpReq.onreadystatechange = function () {
            if (httpReq.readyState == 4 && httpReq.status == 200) {
                resolve(String(httpReq.responseText));
            }
        };
        httpReq.open("GET", `https://contentplayer.hotmart.com/video/${videoId}/hls/${videoQualities[3]}/${videoQualities[3]}.m3u8`)
        httpReq.send();
    })
}

function getKey(videoId, videoQualities, videoPlaylist) {
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
        httpReq.open("GET", `https://contentplayer.hotmart.com/video/${videoId}/hls/${videoQualities[3]}/${keyId}.key`);
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

function getSegmentList(videoId, videoQualities, videoPlaylist) {
    return new Promise(function (resolve, reject) {
        let segmentList = getAllSubstrings(String(videoPlaylist), "segment-", ".ts");
        for (let i = 0; i < segmentList.length; i++) {
            segmentList[i] = `https://contentplayer.hotmart.com/video/${videoId}/hls/${videoQualities[3]}/segment-${i}.ts`;
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

function downloadFinalBlob(finalBlob, localPath, domStyle, tabId) {
    let videoName = undefined;
    let moduleName = undefined;
    let courseName = undefined;
    if(domStyle == "Normal") {
        videoName = new Promise(function (resolve, reject) {
            chrome.tabs.executeScript(tabId, {
                code: 'document.getElementsByClassName("\\\nnavigation-page navigation-page-active")[0].innerText;'
            },
                function (result) {
                    resolve(result);
                })
        })

        moduleName = new Promise(function (resolve, reject) {
            chrome.tabs.executeScript(tabId, {
                code: 'document.getElementsByClassName("\\\nnavigation-page navigation-page-active")[0].parentNode.parentNode.getElementsByClassName("navigation-module-title")[0].innerText;'
            },
                function (result) {
                    resolve(result[0]);
                })
        })

        courseName = new Promise(function (resolve, reject) {
            chrome.tabs.executeScript(tabId, {
                code: 'document.getElementsByClassName("navigation-menu-logo")[0].innerText;'
            },
                function (result) {
                    resolve(result);
                })
        })
    } else {
        videoName = new Promise(function (resolve, reject) {
            chrome.tabs.executeScript(tabId, {
                code: 'document.getElementsByClassName("page__header")[0].innerHTML;'
            },
                function (result) {
                    resolve(getSubstring(String(result), "<h1>", "</h1>"));
                })
        })
    }

    Promise.all([videoName, moduleName, courseName]).then(function (values) {
        videoName = values[0];
        moduleName = values[1];
        courseName = values[2];

        let filename = String(`${courseName}/${moduleName}/${videoName}.mp4`).replace(/\:/g, " -")
        let url = URL.createObjectURL(finalBlob);
        console.log(url)
        console.log(filename);
        chrome.downloads.download({ url: url, filename: filename, saveAs: false });
    }) 

    // videoName.then(function (value) {
    //     videoName = value;
    //     console.log(videoName);
    //     let url = URL.createObjectURL(finalBlob);
    //     chrome.downloads.download({ url: url, filename: `${videoName}.mp4`, saveAs: false });
    // })
}

chrome.browserAction.onClicked.addListener(function (tab) {
    chrome.runtime.reload();
    console.clear();
    getVideoId(tab.id).then(function ([videoId, domStyle]) {
        console.log(videoId);
        getVideoQualities(videoId).then(function (videoQualities) {
            console.log(videoQualities);
            getVideoPlaylist(videoId, videoQualities).then(function (videoPlaylist) {
                //console.log(videoPlaylist);
                getKey(videoId, videoQualities, videoPlaylist).then(function (videoKey) {
                    //console.log(videoKey);
                    getSegmentList(videoId, videoQualities, videoPlaylist).then(function (segmentList) {

                        //console.log(segmentList);
                        let finalBlob = new Blob([], { type: 'video/mp4' });

                        for (let i = 0, p = Promise.resolve(); i < segmentList.length; i++) {
                            p = p.then(() => (
                                getSegment(segmentList[i]).then(function (segment) {
                                    decrypt(segment, videoKey).then(function (decSeg) {

                                        finalBlob = new Blob([finalBlob, decSeg], { type: 'video/mp4' });
                                        console.log(`${i+1}/${segmentList.length} - ${finalBlob.size/1000000} MB`);

                                        if (i == segmentList.length - 1) {
                                            downloadFinalBlob(finalBlob, "notNeededYetChromeBug", domStyle, tab.id);

                                            // videoId = undefined;
                                            // domStyle = undefined;
                                            // videoQualities = undefined;
                                            // videoPlaylist = undefined;
                                            // videoKey = undefined;
                                            // segmentList = undefined;
                                            // segment = undefined;
                                            // decSeg = undefined;
                                            // finalBlob = undefined;
                                            // i = undefined;
                                            // p = undefined;
                                        }
                                    })
                                })
                            ))
                        }
                    })
                });
            });
        });
    });
});