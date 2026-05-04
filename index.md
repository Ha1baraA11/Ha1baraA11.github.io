---
layout: default
title: Home
---

# Hi, I'm ZetaZero

Welcome to my personal site. I'm a developer interested in AI, RAG systems, and building things.

## Recent Posts

<ul>
{% for post in site.posts limit:5 %}
  <li><a href="{{ post.url }}">{{ post.title }}</a> — {{ post.date | date: "%Y-%m-%d" }}</li>
{% endfor %}
</ul>

## About

[About me](/about)
