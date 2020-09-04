new Vue({
    el: "#app",
    data: {
        url: "",
        keyword: "",
        size: 10,
        expand: false,
        info: "",
        result: {
            data: [],
            page: null,
            isLast: null
        }
    },
    computed: {
        inputChange: function() {
            return [this.url, this.keyword, this.size];
        },
        videoId: function() {
            if (this.url === "") return false;
            let url = this.url.search(/^https?:\/\//) !== -1 ? this.url : `http://${this.url}`;
            let params = new URL(url).searchParams;
            if (!params.has("v")) return false;
            return params.get("v");
        }
    },
    watch: {
        inputChange: debounce(async function() {
            this.result = {
                data: [],
                page: null,
                isLast: null
            };
            let validSize = false;
            if (this.size >= 5 && this.size <= 500) {
                validSize = true;
                localStorage.setItem("size", this.size);
            }
            if (this.url === "") return this.info = "Masukkan URL video";
            if (!this.videoId) return this.info = "Format URL salah";
            if (!validSize) return this.info = "Masukkan angka dengan range 5 - 500";
            if (this.keyword) {
                if (this.keyword.length >= 3) {
                    await this.load();
                } else {
                    this.info = "Kata kunci minimal 3 karakter";
                }
            } else {
                this.info = "Masukkan kata kunci yang ingin dicari";
            }
        }, 500),
        url: debounce(function(url) {
            localStorage.setItem("url", url);
        }, 300),
        expand: function(expand) {
            localStorage.setItem("expand", expand);
        }
    },
    created: function() {
        const url = localStorage.getItem("url");
        const size = localStorage.getItem("size");
        const expand = localStorage.getItem("expand");
        if (url !== null) {
            this.url = url;
        } else {
            this.info = "Masukkan URL video";
        }
        if (size !== null) this.size = Number(size);
        if (expand !== null) this.expand = (expand === "true");
    },
    methods: {
        async load() {
            this.info = "...";

            const queries = {
                v: this.videoId,
                lang: "en",
                key: this.keyword,
                marker: "<mark>_$_</mark>",
                size: this.size,
                page: this.result.page + 1
            };
            const requestUrl = "http://yt-transcripts.vercel.app/api?" + this.serialize(queries);
            const respond = await fetch(requestUrl).then((res) => (res.ok ? res.json() : []));

            if (respond.data.length > 0) {
                const combinedData = this.result.data.concat(respond.data);
                this.info = `Menampilkan ${combinedData.length} dari ${respond.search.found} hasil ditemukan`;
                this.result.data = combinedData;
                this.result.page = respond.page;
                this.result.isLast = (respond.page === respond.total_pages);
            } else {
                this.info = `Tidak menemukan hasil dengan kata kunci "${this.keyword}"`;
            }
        },
        formatTime(seconds) {
            const milliseconds = seconds * 1000;
            let result = new Date(milliseconds).toISOString().substr(11, 8);
            if (result.startsWith("00")) {
                result = result.substr(3);
            }
            return result.startsWith("0") ? result.substr(1) : result;
        },
        serialize(obj) {
            let qs = [];
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    qs.push(encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]));
                }
            }
            return qs.join("&");
        },
        floor(num) {
            return Math.floor(num)
        }
    }
});

if ('serviceWorker' in navigator && !["localhost", "127.0.0.1"].includes(location.hostname)) {
    navigator.serviceWorker.register('/sw.js').then((data) => {
        console.log("Registrasi service worker berhasil!");
    }).catch((err) => {
        console.log('Yahh, registrasi service worker gagal', err);
    });
}

function debounce(fn, wait) {
    let timer;
    let resolveList = [];
    return function(...arguments_) {
        return new Promise(resolve => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                timer = null;
                const result = fn.apply(this, arguments_);
                for (resolve of resolveList) {
                    resolve(result);
                }
                resolveList = [];
            }, wait);
            resolveList.push(resolve);
        });
    }
}