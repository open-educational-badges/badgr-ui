export function readFile<T>(file: File, doRead: (File, FileReader) => void): Promise<T> {
	const reader = new FileReader();

	let resolve: (value?: T | PromiseLike<T>) => void;
	let reject: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	reader.onload = (e) => {
		const fr: FileReader = e.target as FileReader;
		resolve(fr.result as unknown as T);
	};
	reader.onerror = (e) => {
		reject(e);
	};

	doRead(file, reader);

	return promise;
}

export function readFileAsText(file: File): Promise<string> {
	return readFile<string>(file, (file: File, reader: FileReader) => reader.readAsText(file));
}

export function readFileAsBuffer(file: File): Promise<ArrayBuffer> {
	return readFile<ArrayBuffer>(file, (file: File, reader: FileReader) => reader.readAsArrayBuffer(file));
}

export function readFileAsDataURL(file: File): Promise<string> {
	return readFile<string>(file, (file: File, reader: FileReader) => reader.readAsDataURL(file));
}

const imagePromises: { [src: string]: Promise<HTMLImageElement> } = {};
export function loadImageURL(imageUrl: string): Promise<HTMLImageElement> {
	let resolve: (value?: HTMLImageElement | PromiseLike<HTMLImageElement>) => void;
	let reject: (reason?: unknown) => void;
	const promise = new Promise<HTMLImageElement>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	const image = new Image();
	image.onload = (e) => {
		resolve(image);
	};
	image.onerror = (e) => {
		reject(e);
	};

	image.src = imageUrl;

	return promise;
}

export function preloadImageURL(imageURL: string): string {
	if (!imagePromises[imageURL]) {
		imagePromises[imageURL] = loadImageURL(imageURL);
	}

	return imageURL;
}

export function base64ByteSize(base64: string) {
	return (base64.length / 4) * 3;
}
