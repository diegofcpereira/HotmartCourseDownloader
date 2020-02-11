function getSubstring(string, start, end) {
    return (
        string.substring(
            string.indexOf(start) + start.length,
            string.indexOf(end)
        )
    );
}

function parseStringAsArray(string, char) {
    return string.split(char).map(item => item.trim()).filter(Boolean);
}

function getAllSubstrings(string, start, end) {
    return string.match(RegExp(`(?<=${start})(.*)(?=${end})`, 'g'));
}

function replaceBetweenGlobal(string, start, end, replacement) {
    return string.replace(RegExp(`(?<=${start})(.*)(?=${end})`, 'g'), replacement);
}

export { getSubstring, parseStringAsArray, getAllSubstrings, replaceBetweenGlobal };