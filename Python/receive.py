#!/usr/bin/env python
import pika
import time

connection = pika.BlockingConnection(
    pika.ConnectionParameters(host='localhost'))
channel = connection.channel()

channel.queue_declare(queue='SAC', durable=True)
print(' [*] Waiting for messages. To exit press CTRL+C')


def callback(ch, method, properties, body):
	msg = body.decode().split(":")
	print(" [x] Received %r" % msg[1])
	time.sleep(body.count(b'.'))
	print(" [x] Done")
	ch.basic_ack(delivery_tag=method.delivery_tag)


channel.basic_qos(prefetch_count=1)
channel.basic_consume(queue='SAC', on_message_callback=callback)

channel.start_consuming()
