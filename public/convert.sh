#!/bin/bash
i=0;
while read file
do
  echo $file;
	tmp=`dirname "$file"`
	f=${tmp}/$i
	convert "$file" -resize 350x350^ "${f}_350.jpg"
	convert "$file" -resize 75x75^ -gravity Center -crop 75x75+0+0 +repage "${f}_min.jpg"
	i=$(($i + 1));
done < <(find . -name \*.jpg)
