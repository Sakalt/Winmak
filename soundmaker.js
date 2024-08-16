// soundmaker.js

let audioContext;
let syllables = [];  // 音節のリスト

// オーディオコンテキストの初期化
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// 音節を追加する関数
function addSyllable() {
    const frequency = parseFloat(document.getElementById('frequencyInput').value);
    const duration = parseFloat(document.getElementById('durationInput').value);
    const type = document.getElementById('waveTypeSelect').value;

    const syllable = { frequency, duration, type };
    syllables.push(syllable);

    addSyllableButton(syllables.length - 1);
}

// 音節用のボタンを追加する関数
function addSyllableButton(index) {
    const button = document.createElement('button');
    button.textContent = `音節 ${index + 1} 再生`;
    button.addEventListener('click', () => playSyllable(syllables[index], audioContext.currentTime));
    document.getElementById('syllableButtons').appendChild(button);
}

// 音節を再生する関数
function playSyllable({ frequency, duration, type }, startTime) {
    initAudio();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gainNode.gain.setValueAtTime(document.getElementById('volumeControl').value / 100, startTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
}

// すべての音節を連続再生する関数
function playAllSyllables() {
    initAudio();

    let currentTime = audioContext.currentTime;
    syllables.forEach(syllable => {
        playSyllable(syllable, currentTime);
        currentTime += syllable.duration;
    });
}

// 音節をWAVファイルとしてエクスポートする関数
function exportSound() {
    initAudio();

    const offlineAudioContext = new OfflineAudioContext(1, audioContext.sampleRate * syllables.reduce((acc, syllable) => acc + syllable.duration, 0), audioContext.sampleRate);

    let currentTime = 0;
    syllables.forEach(({ frequency, duration, type }) => {
        const oscillator = offlineAudioContext.createOscillator();
        const gainNode = offlineAudioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, currentTime);
        gainNode.gain.setValueAtTime(document.getElementById('volumeControl').value / 100, currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(offlineAudioContext.destination);

        oscillator.start(currentTime);
        oscillator.stop(currentTime + duration);
        currentTime += duration;
    });

    offlineAudioContext.startRendering().then(renderedBuffer => {
        const wavBlob = bufferToWave(renderedBuffer);
        const url = URL.createObjectURL(wavBlob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'sound.wav';
        anchor.click();
    });
}

// AudioBufferをWAV形式に変換する関数
function bufferToWave(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    const channels = [];
    let offset = 0;
    let pos = 0;

    // ヘッダの設定
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // ファイルサイズ - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // chunk size
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded in this demo)

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // インターリーブとチャネルデータの設定
    for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

    while (pos < length) {
        for (let i = 0; i < numOfChan; i++) {  // インターリーブ
            const sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
            view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true); // convert to 16-bit PCM
            pos += 2;
        }
        offset++;
    }

    function setUint16(data) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data) {
        view.setUint32(pos, data, true);
        pos += 4;
    }

    return new Blob([view], { type: 'audio/wav' });
}

// イベントリスナーの設定
document.getElementById('addSyllableBtn').addEventListener('click', addSyllable);
document.getElementById('playAllBtn').addEventListener('click', playAllSyllables);
document.getElementById('exportBtn').addEventListener('click', exportSound);
