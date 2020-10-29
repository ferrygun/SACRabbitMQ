#!/usr/bin/env python
import pika
import sys

connection = pika.BlockingConnection(
    pika.ConnectionParameters(host='localhost'))
channel = connection.channel()

channel.queue_declare(queue='SAC', durable=True) #task_queue will be permanent

message = ' '.join(sys.argv[1:]) or "Hello World from SAC"
channel.basic_publish(
    exchange='amq.topic',
    routing_key='events',
    body='loc:' + message,
    properties=pika.BasicProperties(
        delivery_mode=2,  # make message persistent
    ))
print(" [x] Sent %r" % message)
connection.close()
